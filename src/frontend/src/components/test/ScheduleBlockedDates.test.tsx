import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import ScheduleBlockedDates from "@/components/ScheduleBlockedDates"
import type ScheduleBlockedDateView from "@/types/schedule/ScheduleBlockedDateView.types"

const BLOCKS: ScheduleBlockedDateView[] = [
    {
        index: 1,
        date: "2026-11-04",
        startTime: null,
        endTime: null,
        description: "Ponto facultativo",
        messages: []
    },
    {
        index: 0,
        date: "2026-11-20",
        startTime: "08:30",
        endTime: "10:00",
        description: "Reunião de equipe",
        messages: ["Afeta o agendamento A1B2C3D4 (20/11 às 09:00): Período bloqueado (08:30–10:00)"]
    }
]

function renderBlocks(overrides: Partial<Parameters<typeof ScheduleBlockedDates>[0]> = {}) {
    const props = {
        blocks: BLOCKS,
        newDate: "",
        newDescription: "",
        newError: null,
        onChangeNewDate: vi.fn(),
        onChangeNewDescription: vi.fn(),
        onAdd: vi.fn(),
        onRemove: vi.fn(),
        ...overrides
    }
    render(<ScheduleBlockedDates {...props} />)

    return { ...props, user: userEvent.setup() }
}

describe("ScheduleBlockedDates", () => {
    it("mostra cada bloqueio com a data, o dia da semana, a descrição e o período", () => {
        renderBlocks()

        const [first, second] = screen.getAllByRole("listitem")
        expect(within(first).getByText("04/11/2026")).toBeInTheDocument()
        expect(within(first).getByText("Quarta-feira")).toBeInTheDocument()
        expect(within(first).getByText("Dia inteiro")).toBeInTheDocument()
        expect(within(second).getByText("Sexta-feira")).toBeInTheDocument()
        expect(within(second).getByText("08:30–10:00")).toBeInTheDocument()
        expect(within(second).getByText(/Período bloqueado/)).toBeInTheDocument()
    })

    it("remove o bloqueio pela posição no rascunho", async () => {
        const { onRemove, user } = renderBlocks()

        await user.click(screen.getByRole("button", { name: "Remover o bloqueio de 20/11/2026" }))

        expect(onRemove).toHaveBeenCalledWith(0)
    })

    it("mostra a lista vazia", () => {
        renderBlocks({ blocks: [] })

        expect(screen.getByText("Nenhuma data bloqueada.")).toBeInTheDocument()
        expect(
            screen.getByText(
                "Feriados e pontos facultativos. O chatbot não oferece horários nos dias bloqueados."
            )
        ).toBeInTheDocument()
    })

    it("preenche o formulário de dia inteiro e adiciona", async () => {
        const { onChangeNewDate, onChangeNewDescription, onAdd, user } = renderBlocks()

        fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-11-05" } })
        await user.type(screen.getByLabelText("Descrição"), "P")
        await user.click(screen.getByRole("button", { name: "Adicionar" }))

        expect(onChangeNewDate).toHaveBeenCalledWith("2026-11-05")
        expect(onChangeNewDescription).toHaveBeenCalledWith("P")
        expect(onAdd).toHaveBeenCalled()
    })

    it("mostra o erro do formulário ligado aos campos", () => {
        renderBlocks({
            newDate: "2026-11-04",
            newError:
                "Esta data tem 2 agendamentos. Para bloqueá-la, peça a quem gerencia os agendamentos para cancelar ou remarcar antes."
        })

        expect(screen.getByRole("alert")).toHaveTextContent("Esta data tem 2 agendamentos.")
        expect(screen.getByLabelText("Data")).toHaveAttribute("aria-invalid", "true")
        expect(screen.getByLabelText("Data")).toHaveValue("2026-11-04")
    })
})
