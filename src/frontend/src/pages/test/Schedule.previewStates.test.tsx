import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildMonthlyPreview from "@/testUtils/buildMonthlyPreview"
import renderSchedulePage from "@/testUtils/renderSchedulePage"

vi.setConfig({ testTimeout: 20000 })

const SLOW = { timeout: 10000 }

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

function previewSection(): HTMLElement {
    return screen
        .getByRole("heading", { name: "Prévia da grade" })
        .closest("section") as HTMLElement
}

function calendarGrid(): HTMLElement {
    return within(previewSection()).getByText("Dom").parentElement as HTMLElement
}

describe("SchedulePage: estados da prévia", () => {
    it("não diz que está atualizando quando a prévia do mês pedido falhou", async () => {
        const { user } = await renderSchedulePage({
            handlers: {
                "GET /api/v1/schedule/preview": ({ url }) =>
                    url.searchParams.get("month") === null
                        ? { status: 200, body: { data: buildMonthlyPreview("2026-11") } }
                        : { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } }
            }
        })
        await screen.findByText("Novembro de 2026", {}, SLOW)

        await user.click(screen.getByRole("button", { name: "Próximo mês" }))

        expect(await within(previewSection()).findByRole("alert", {}, SLOW)).toBeInTheDocument()
        expect(within(previewSection()).queryByRole("status")).not.toBeInTheDocument()
    })

    it("não diz que está atualizando quando o rascunho tem erro local", async () => {
        const { user } = await renderSchedulePage()
        await screen.findByText("Novembro de 2026", {}, SLOW)

        await user.clear(screen.getByLabelText("Vagas simultâneas por horário"))
        await user.click(screen.getByRole("button", { name: "Próximo mês" }))

        expect(screen.getByText("Dezembro de 2026")).toBeInTheDocument()
        expect(within(previewSection()).queryByRole("status")).not.toBeInTheDocument()
    })

    it("não marca a grade como ocupada quando a prévia do rascunho falha no mesmo mês", async () => {
        const { user } = await renderSchedulePage({
            handlers: {
                "POST /api/v1/schedule/preview": () => ({
                    status: 500,
                    body: { error: { code: "INTERNAL_ERROR", message: "x" } }
                })
            }
        })
        await screen.findByText("Novembro de 2026", {}, SLOW)

        await user.clear(screen.getByLabelText("Vagas simultâneas por horário"))
        await user.type(screen.getByLabelText("Vagas simultâneas por horário"), "3")

        expect(await within(previewSection()).findByRole("alert", {}, SLOW)).toBeInTheDocument()
        expect(within(previewSection()).queryByRole("status")).not.toBeInTheDocument()
        expect(calendarGrid()).not.toHaveAttribute("aria-busy")
        expect(screen.queryByText(/O calendário abaixo ainda é de/)).not.toBeInTheDocument()
    })
})
