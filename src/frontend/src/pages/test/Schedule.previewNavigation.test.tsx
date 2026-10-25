import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildMonthlyPreview from "@/testUtils/buildMonthlyPreview"
import renderSchedulePage from "@/testUtils/renderSchedulePage"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

function delayedReplies() {
    const waiting: (() => void)[] = []

    function later(reply: Reply): Promise<Reply> {
        return new Promise((resolve) => {
            waiting.push(() => resolve(reply))
        })
    }

    function releaseAll() {
        waiting.splice(0).forEach((release) => release())
    }

    return { later, releaseAll }
}

function calendarGrid(): HTMLElement {
    return within(previewSection()).getByText("Dom").parentElement as HTMLElement
}

function previewSection(): HTMLElement {
    return screen
        .getByRole("heading", { name: "Prévia da grade" })
        .closest("section") as HTMLElement
}

describe("SchedulePage: navegação e atualização da prévia", () => {
    it("avança um mês por clique mesmo com a prévia atrasada e mostra que está carregando", async () => {
        const delayed = delayedReplies()
        const { user, callsTo } = await renderSchedulePage({
            handlers: {
                "GET /api/v1/schedule/preview": ({ url }) => {
                    const month = url.searchParams.get("month")
                    const reply = {
                        status: 200,
                        body: { data: buildMonthlyPreview(month ?? "2026-11") }
                    }

                    return month === null ? reply : delayed.later(reply)
                }
            }
        })
        await screen.findByText("Novembro de 2026")

        await user.click(screen.getByRole("button", { name: "Próximo mês" }))
        await user.click(screen.getByRole("button", { name: "Próximo mês" }))
        await user.click(screen.getByRole("button", { name: "Próximo mês" }))

        expect(screen.getByText("Fevereiro de 2027")).toBeInTheDocument()
        expect(within(previewSection()).getByRole("status")).toHaveTextContent(
            "Atualizando a prévia..."
        )
        expect(calendarGrid()).toHaveAttribute("aria-busy", "true")
        await waitFor(() =>
            expect(callsTo("GET", "/api/v1/schedule/preview").at(-1)?.url.search).toBe(
                "?month=2027-02"
            )
        )
        delayed.releaseAll()
        expect(await screen.findByRole("button", { name: /^01\/02/ })).toBeInTheDocument()
        await waitFor(() =>
            expect(within(previewSection()).queryByRole("status")).not.toBeInTheDocument()
        )
        expect(calendarGrid()).not.toHaveAttribute("aria-busy")
        expect(screen.queryByText(/O calendário abaixo ainda é de/)).not.toBeInTheDocument()
    })

    it("volta um mês por clique a partir do mês pedido", async () => {
        const delayed = delayedReplies()
        const { user } = await renderSchedulePage({
            handlers: {
                "GET /api/v1/schedule/preview": ({ url }) => {
                    const month = url.searchParams.get("month")
                    const reply = {
                        status: 200,
                        body: { data: buildMonthlyPreview(month ?? "2026-11") }
                    }

                    return month === null ? reply : delayed.later(reply)
                }
            }
        })
        await screen.findByText("Novembro de 2026")

        await user.click(screen.getByRole("button", { name: "Mês anterior" }))
        await user.click(screen.getByRole("button", { name: "Mês anterior" }))

        expect(screen.getByText("Setembro de 2026")).toBeInTheDocument()
        delayed.releaseAll()
    })

    it("sinaliza que a prévia salva está desatualizada enquanto a do rascunho não chega", async () => {
        const delayed = delayedReplies()
        const { user, callsTo } = await renderSchedulePage({
            handlers: {
                "POST /api/v1/schedule/preview": () =>
                    delayed.later({
                        status: 200,
                        body: { data: buildMonthlyPreview("2026-11", [], { freeWindowSeats: 99 }) }
                    })
            }
        })
        await screen.findByText("236 de 240 vagas livres na janela")

        await user.clear(screen.getByLabelText("Vagas simultâneas por horário"))
        await user.type(screen.getByLabelText("Vagas simultâneas por horário"), "3")

        expect(within(previewSection()).getByRole("status")).toHaveTextContent(
            "Atualizando a prévia..."
        )
        expect(calendarGrid()).toHaveAttribute("aria-busy", "true")
        await waitFor(() => expect(callsTo("POST", "/api/v1/schedule/preview")).toHaveLength(1))
        delayed.releaseAll()
        expect(await screen.findByText("99 de 240 vagas livres na janela")).toBeInTheDocument()
        await waitFor(() =>
            expect(within(previewSection()).queryByRole("status")).not.toBeInTheDocument()
        )
    })

    it("com erro local, avisa que o calendário ainda é do mês anterior ao trocar de mês", async () => {
        const { user, callsTo } = await renderSchedulePage()
        await screen.findByText("Novembro de 2026")

        await user.clear(screen.getByLabelText("Vagas simultâneas por horário"))
        await user.click(screen.getByRole("button", { name: "Próximo mês" }))

        expect(screen.getByText("Dezembro de 2026")).toBeInTheDocument()
        expect(
            screen.getByText("O calendário abaixo ainda é de Novembro de 2026.")
        ).toBeInTheDocument()
        expect(calendarGrid()).toHaveAttribute("aria-busy", "true")
        expect(callsTo("POST", "/api/v1/schedule/preview")).toEqual([])
    })

    it("com a prévia em falha, avisa que o calendário ainda é do mês anterior ao trocar de mês", async () => {
        const { user } = await renderSchedulePage({
            handlers: {
                "GET /api/v1/schedule/preview": ({ url }) =>
                    url.searchParams.get("month") === null
                        ? { status: 200, body: { data: buildMonthlyPreview("2026-11") } }
                        : { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } }
            }
        })
        await screen.findByText("Novembro de 2026")

        await user.click(screen.getByRole("button", { name: "Próximo mês" }))

        expect(await within(previewSection()).findByRole("alert")).toBeInTheDocument()
        expect(screen.getByText("Dezembro de 2026")).toBeInTheDocument()
        expect(
            screen.getByText("O calendário abaixo ainda é de Novembro de 2026.")
        ).toBeInTheDocument()
        expect(calendarGrid()).toHaveAttribute("aria-busy", "true")
    })
})
