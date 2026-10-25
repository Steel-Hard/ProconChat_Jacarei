import { fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildBookedDays from "@/testUtils/buildBookedDays"
import buildMonthlyPreview from "@/testUtils/buildMonthlyPreview"
import renderSchedulePage from "@/testUtils/renderSchedulePage"

vi.setConfig({ testTimeout: 20000 })

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

function wednesdayRow(): HTMLElement {
    return screen.getByRole("checkbox", { name: "Quarta-feira" }).closest("li") as HTMLElement
}

function renderBooked() {
    return renderSchedulePage({
        bookedDays: buildBookedDays(),
        handlers: {
            "GET /api/v1/schedule/preview": () => ({
                status: 200,
                body: {
                    data: buildMonthlyPreview("2026-11", [
                        { date: "2026-11-04", status: "AVAILABLE", freeSeats: 6, capacity: 8 }
                    ])
                }
            })
        }
    })
}

describe("SchedulePage: dias com agendamento", () => {
    it("marca o dia com agendamento na prévia e lista os horários no detalhe", async () => {
        const { user } = await renderBooked()

        const cell = await screen.findByRole("button", {
            name: "04/11: 6 vagas livres · 2 agendamentos"
        })
        await user.click(cell)

        expect(screen.getByText("09:00 · 1 agendamento")).toBeInTheDocument()
        expect(screen.getByText("14:00 · 1 agendamento")).toBeInTheDocument()
    })

    it("trava o dia da semana e as faixas com agendamento", async () => {
        await renderBooked()
        await screen.findByRole("button", { name: "04/11: 6 vagas livres · 2 agendamentos" })

        expect(screen.getByRole("checkbox", { name: "Quarta-feira" })).toHaveAttribute(
            "aria-disabled",
            "true"
        )
        expect(screen.getByRole("checkbox", { name: "Quarta-feira" })).toHaveAccessibleDescription(
            "Há agendamentos em 04/11. Para desligar este dia, peça a quem gerencia os agendamentos para cancelar ou remarcar antes."
        )
        within(wednesdayRow())
            .getAllByRole("button", { name: /^Remover faixa .* de Quarta-feira indisponível/ })
            .forEach((button) => expect(button).toHaveAttribute("aria-disabled", "true"))
    })

    it("recusa bloquear a data com agendamento", async () => {
        const { user } = await renderBooked()
        await screen.findByRole("button", { name: "04/11: 6 vagas livres · 2 agendamentos" })

        fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-11-04" } })
        fireEvent.change(screen.getByLabelText("Descrição"), {
            target: { value: "Ponto facultativo" }
        })
        await user.click(screen.getByRole("button", { name: "Adicionar" }))

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Esta data tem 2 agendamentos. Para bloqueá-la, peça a quem gerencia os agendamentos para cancelar ou remarcar antes."
        )
        expect(screen.queryByText("Ponto facultativo", { selector: "div" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /não salvas?$/ })).not.toBeInTheDocument()
    })

    it("não trava nada sem agendamento", async () => {
        await renderSchedulePage()

        await screen.findByRole("checkbox", { name: "Quarta-feira" })

        expect(screen.getByRole("checkbox", { name: "Quarta-feira" })).not.toHaveAttribute(
            "aria-disabled"
        )
        within(wednesdayRow())
            .getAllByRole("button", { name: /^Remover faixa .* de Quarta-feira$/ })
            .forEach((button) => expect(button).not.toHaveAttribute("aria-disabled"))
    })

    it("avisa quando não consegue verificar os dias com agendamento", async () => {
        await renderSchedulePage({
            handlers: {
                "GET /api/v1/schedule/booked-days": () => ({
                    status: 500,
                    body: { error: { code: "INTERNAL_ERROR", message: "x" } }
                })
            }
        })

        expect(
            await screen.findByText(
                "Não foi possível verificar os dias que já têm agendamento. A prévia e o salvamento continuam apontando os agendamentos afetados."
            )
        ).toBeInTheDocument()
    })
})
