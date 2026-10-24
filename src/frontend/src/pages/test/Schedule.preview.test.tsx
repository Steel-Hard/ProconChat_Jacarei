import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildMonthlyPreview from "@/testUtils/buildMonthlyPreview"
import renderSchedulePage from "@/testUtils/renderSchedulePage"

vi.setConfig({ testTimeout: 20000 })

const SAVED_PREVIEW = buildMonthlyPreview("2026-11", [
    { date: "2026-11-03", status: "AVAILABLE", freeSeats: 7, capacity: 8 }
])

const DRAFT_PREVIEW = buildMonthlyPreview("2026-11", [
    { date: "2026-11-03", status: "AVAILABLE", freeSeats: 12, capacity: 12 },
    { date: "2026-11-04", status: "FULL", freeSeats: 0, capacity: 12 }
])

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

async function loaded() {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const page = await renderSchedulePage({
        handlers: {
            "GET /api/v1/schedule/preview": () => ({ status: 200, body: { data: SAVED_PREVIEW } }),
            "POST /api/v1/schedule/preview": () => ({ status: 200, body: { data: DRAFT_PREVIEW } }),
            "PUT /api/v1/schedule": () => ({
                status: 500,
                body: { error: { code: "INTERNAL_ERROR", message: "x" } }
            })
        }
    })
    await screen.findByRole("button", { name: "03/11: 7 vagas livres" })

    return { ...page, user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }) }
}

describe("SchedulePage: prévia", () => {
    it("mostra a prévia salva e, com o rascunho, a do servidor para o mesmo corpo do PUT", async () => {
        const { user, callsTo } = await loaded()

        await user.clear(screen.getByLabelText("Vagas simultâneas por horário"))
        await user.type(screen.getByLabelText("Vagas simultâneas por horário"), "3")
        await vi.advanceTimersByTimeAsync(400)

        expect(
            await screen.findByRole("button", { name: "03/11: 12 vagas livres" })
        ).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "04/11: Lotado" })).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))
        await waitFor(() => expect(callsTo("PUT", "/api/v1/schedule")).toHaveLength(1))
        const posts = callsTo("POST", "/api/v1/schedule/preview")
        expect(posts.at(-1)?.body).toEqual({ config: callsTo("PUT", "/api/v1/schedule")[0].body })
        expect(callsTo("GET", "/api/v1/schedule/preview")).toHaveLength(1)
    })

    it("com erro local mantém a última prévia com o aviso e não pede outra", async () => {
        const { user, callsTo } = await loaded()

        await user.clear(screen.getByLabelText("Vagas simultâneas por horário"))
        await vi.advanceTimersByTimeAsync(800)

        expect(
            screen.getByText("Corrija os campos com erro para atualizar a prévia.")
        ).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "03/11: 7 vagas livres" })).toBeInTheDocument()
        expect(callsTo("POST", "/api/v1/schedule/preview")).toEqual([])
    })

    it("navega para o próximo mês pela prévia salva", async () => {
        const { user, callsTo } = await loaded()

        await user.click(screen.getByRole("button", { name: "Próximo mês" }))

        await waitFor(() =>
            expect(
                callsTo("GET", "/api/v1/schedule/preview").map((call) => call.url.search)
            ).toEqual(["", "?month=2026-12"])
        )
    })
})
