import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import ScheduleWeekGrid from "@/components/ScheduleWeekGrid"
import type ScheduleDayView from "@/types/schedule/ScheduleDayView.types"

function day(overrides: Partial<ScheduleDayView> = {}): ScheduleDayView {
    return {
        weekday: 1,
        enabled: true,
        lockedReason: null,
        ranges: [
            { startTime: "08:30", endTime: "11:30", error: null, removeLocked: false },
            { startTime: "13:30", endTime: "16:30", error: null, removeLocked: false }
        ],
        canAdd: true,
        messages: [],
        ...overrides
    }
}

function renderGrid(days: ScheduleDayView[], showContentLink = false) {
    const handlers = {
        onToggleDay: vi.fn(),
        onChangeRange: vi.fn(),
        onRemoveRange: vi.fn(),
        onAddRange: vi.fn()
    }
    render(
        <MemoryRouter>
            <ScheduleWeekGrid days={days} showContentLink={showContentLink} {...handlers} />
        </MemoryRouter>
    )

    return { ...handlers, user: userEvent.setup() }
}

function row(name: string) {
    return screen.getByRole("checkbox", { name }).closest("li") as HTMLElement
}

describe("ScheduleWeekGrid", () => {
    it("mostra os dias com as faixas e o dia desligado sem atendimento", () => {
        renderGrid([day(), day({ weekday: 0, enabled: false, ranges: [], canAdd: false })])

        expect(screen.getByRole("checkbox", { name: "Segunda-feira" })).toBeChecked()
        expect(screen.getByRole("checkbox", { name: "Domingo" })).not.toBeChecked()
        expect(screen.getByLabelText("Início da faixa 1 de Segunda-feira")).toHaveValue("08:30")
        expect(screen.getByLabelText("Fim da faixa 2 de Segunda-feira")).toHaveValue("16:30")
        expect(within(row("Domingo")).getByText("Sem atendimento")).toBeInTheDocument()
    })

    it("liga e desliga o dia pelo checkbox", async () => {
        const { onToggleDay, user } = renderGrid([day()])

        await user.click(screen.getByRole("checkbox", { name: "Segunda-feira" }))

        expect(onToggleDay).toHaveBeenCalledWith(1)
    })

    it("avisa a mudança do início e do fim da faixa", () => {
        const { onChangeRange } = renderGrid([day()])

        fireEvent.change(screen.getByLabelText("Início da faixa 2 de Segunda-feira"), {
            target: { value: "14:00" }
        })
        fireEvent.change(screen.getByLabelText("Fim da faixa 1 de Segunda-feira"), {
            target: { value: "12:00" }
        })

        expect(onChangeRange).toHaveBeenNthCalledWith(1, 1, 1, "startTime", "14:00")
        expect(onChangeRange).toHaveBeenNthCalledWith(2, 1, 0, "endTime", "12:00")
    })

    it("remove a faixa e adiciona outra", async () => {
        const { onRemoveRange, onAddRange, user } = renderGrid([day()])

        await user.click(
            within(row("Segunda-feira")).getAllByRole("button", { name: "Remover faixa" })[1]
        )
        await user.click(screen.getByRole("button", { name: "Adicionar faixa em Segunda-feira" }))

        expect(onRemoveRange).toHaveBeenCalledWith(1, 1)
        expect(onAddRange).toHaveBeenCalledWith(1)
        expect(
            screen.getByRole("button", { name: "Adicionar faixa em Segunda-feira" })
        ).toHaveTextContent("+ Faixa")
    })

    it("esconde + Faixa quando o dia não pode ganhar outra", () => {
        renderGrid([day({ canAdd: false })])

        expect(screen.queryByRole("button", { name: /Adicionar faixa/ })).not.toBeInTheDocument()
    })

    it("mostra o erro na faixa, ligado aos campos", () => {
        renderGrid([
            day({
                ranges: [
                    {
                        startTime: "10:00",
                        endTime: "09:00",
                        error: "O fim deve ser depois do início",
                        removeLocked: false
                    }
                ]
            })
        ])

        const start = screen.getByLabelText("Início da faixa 1 de Segunda-feira")
        expect(start).toHaveAttribute("aria-invalid", "true")
        expect(start).toHaveAccessibleDescription("O fim deve ser depois do início")
    })

    it("trava o checkbox do dia com agendamento e explica o motivo", async () => {
        const reason =
            "Há agendamentos em 04/11 e 11/11. Para desligar este dia, cancele ou remarque."
        const { onToggleDay, user } = renderGrid([day({ lockedReason: reason })])

        const checkbox = screen.getByRole("checkbox", { name: "Segunda-feira" })
        await user.click(checkbox)
        await user.keyboard(" ")

        expect(checkbox).toHaveAttribute("aria-disabled", "true")
        expect(checkbox).toBeChecked()
        expect(checkbox).toHaveAccessibleDescription(reason)
        expect(onToggleDay).not.toHaveBeenCalled()
    })

    it("deixa o checkbox travado receber foco pelo teclado com o motivo", async () => {
        const reason = "Há agendamentos em 04/11."
        const { user } = renderGrid([day({ lockedReason: reason })])

        await user.tab()

        expect(screen.getByRole("checkbox", { name: "Segunda-feira" })).toHaveFocus()
    })

    it("deixa o × travado receber foco e não remove a faixa", async () => {
        const { onRemoveRange, user } = renderGrid([
            day({
                ranges: [{ startTime: "08:30", endTime: "11:30", error: null, removeLocked: true }]
            })
        ])
        const remove = screen.getByRole("button", { name: /^Remover faixa indisponível/ })

        remove.focus()
        await user.keyboard("{Enter}")
        await user.click(remove)

        expect(remove).toHaveFocus()
        expect(remove).toHaveAttribute("aria-disabled", "true")
        expect(onRemoveRange).not.toHaveBeenCalled()
    })

    it("trava o × da faixa com agendamento com o motivo no nome acessível", () => {
        renderGrid([
            day({
                ranges: [
                    { startTime: "08:30", endTime: "11:30", error: null, removeLocked: true },
                    { startTime: "13:30", endTime: "16:30", error: null, removeLocked: false }
                ]
            })
        ])

        expect(
            screen.getByRole("button", {
                name: /^Remover faixa indisponível: há agendamento nesta faixa/
            })
        ).toHaveAttribute("aria-disabled", "true")
        expect(screen.getByRole("button", { name: "Remover faixa" })).not.toHaveAttribute(
            "aria-disabled"
        )
    })

    it("deixa tudo livre sem agendamento", () => {
        renderGrid([day()])

        expect(screen.getByRole("checkbox", { name: "Segunda-feira" })).toBeEnabled()
        expect(screen.getByRole("checkbox", { name: "Segunda-feira" })).not.toHaveAttribute(
            "aria-disabled"
        )
        screen.getAllByRole("button", { name: "Remover faixa" }).forEach((button) => {
            expect(button).toBeEnabled()
            expect(button).not.toHaveAttribute("aria-disabled")
        })
    })

    it("mostra na linha do dia os conflitos da prévia", () => {
        const message =
            "Afeta o agendamento A1B2C3D4 (04/11 às 14:00): Faixa de horário removida ou alterada"
        renderGrid([day({ messages: [message] })])

        expect(within(row("Segunda-feira")).getByText(message)).toBeInTheDocument()
        expect(screen.getByRole("checkbox", { name: "Segunda-feira" })).toHaveAccessibleDescription(
            message
        )
    })

    it("mostra o aviso de Conteúdo e o link só quando pode", () => {
        renderGrid([day()], true)

        expect(
            screen.getByText(
                "Se você mudar horários ou endereço, revise as perguntas do Conteúdo que citam essas informações."
            )
        ).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Revisar Conteúdo →" })).toHaveAttribute(
            "href",
            "/conteudo"
        )
    })

    it("esconde o link de Conteúdo sem permissão", () => {
        renderGrid([day()])

        expect(screen.queryByRole("link", { name: "Revisar Conteúdo →" })).not.toBeInTheDocument()
    })
})
