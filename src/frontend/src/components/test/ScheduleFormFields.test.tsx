import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import ScheduleDurationSeats from "@/components/ScheduleDurationSeats"
import ScheduleUnitFields from "@/components/ScheduleUnitFields"
import ScheduleWindowFields from "@/components/ScheduleWindowFields"

function renderFields(overrides: Partial<Parameters<typeof ScheduleDurationSeats>[0]> = {}) {
    const props = {
        slotMinutes: 30 as const,
        seatsPerSlot: "2",
        durationMessages: [],
        seatsMessages: [],
        onChangeSlotMinutes: vi.fn(),
        onChangeSeats: vi.fn(),
        ...overrides
    }
    render(<ScheduleDurationSeats {...props} />)

    return { ...props, user: userEvent.setup() }
}

describe("ScheduleDurationSeats", () => {
    it("mostra a duração e as vagas e avisa as mudanças", async () => {
        const { onChangeSlotMinutes, onChangeSeats, user } = renderFields()

        expect(screen.getByLabelText("Duração de cada atendimento")).toHaveValue("30")
        expect(screen.getByRole("option", { name: "20 minutos" })).toBeInTheDocument()
        await user.selectOptions(screen.getByLabelText("Duração de cada atendimento"), "60")
        await user.type(screen.getByLabelText("Vagas simultâneas por horário"), "0")

        expect(onChangeSlotMinutes).toHaveBeenCalledWith(60)
        expect(onChangeSeats).toHaveBeenCalledWith("20")
    })

    it("mostra o erro das vagas e o conflito da duração ligados aos campos", () => {
        renderFields({
            seatsMessages: ["Vagas por horário devem estar entre 1 e 20"],
            durationMessages: [
                "Afeta o agendamento A1B2C3D4 (04/11 às 08:30): Horário deixou de existir"
            ]
        })

        expect(screen.getByLabelText("Vagas simultâneas por horário")).toHaveAccessibleDescription(
            "Vagas por horário devem estar entre 1 e 20"
        )
        expect(screen.getByLabelText("Duração de cada atendimento")).toHaveAttribute(
            "aria-invalid",
            "true"
        )
        expect(screen.getByLabelText("Duração de cada atendimento")).toHaveAccessibleDescription(
            "Afeta o agendamento A1B2C3D4 (04/11 às 08:30): Horário deixou de existir"
        )
    })
})

describe("ScheduleWindowFields", () => {
    it("mostra a janela, a antecedência e o alerta e avisa as mudanças", async () => {
        const handlers = {
            onChangeWindowDays: vi.fn(),
            onChangeMinNoticeDays: vi.fn(),
            onChangeWaitAlertDays: vi.fn()
        }
        render(
            <ScheduleWindowFields
                windowDays="30"
                minNoticeDays={1}
                waitAlertDays="7"
                windowMessages={["Janela de agendamento deve estar entre 1 e 180 dias"]}
                waitAlertMessages={[]}
                {...handlers}
            />
        )
        const user = userEvent.setup()

        expect(screen.getByLabelText("Antecedência mínima")).toHaveValue("1")
        expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
            "Sem antecedência (mesmo dia)",
            "1 dia útil",
            "2 dias úteis",
            "3 dias úteis",
            "5 dias úteis"
        ])
        expect(screen.getByLabelText("Oferecer horários até")).toHaveAccessibleDescription(
            "Horários além deste prazo não são oferecidos. Janela de agendamento deve estar entre 1 e 180 dias"
        )
        await user.selectOptions(screen.getByLabelText("Antecedência mínima"), "5")
        await user.type(screen.getByLabelText("Alertar quando a espera passar de"), "1")
        await user.type(screen.getByLabelText("Oferecer horários até"), "5")

        expect(handlers.onChangeMinNoticeDays).toHaveBeenCalledWith(5)
        expect(handlers.onChangeWaitAlertDays).toHaveBeenCalledWith("71")
        expect(handlers.onChangeWindowDays).toHaveBeenCalledWith("305")
    })
})

describe("ScheduleUnitFields", () => {
    it("mostra endereço e complemento, os erros e avisa as mudanças", async () => {
        const handlers = { onChangeAddress: vi.fn(), onChangeComplement: vi.fn() }
        render(
            <MemoryRouter>
                <ScheduleUnitFields
                    address=""
                    complement="Sala 2"
                    addressMessages={["Endereço da unidade obrigatório"]}
                    complementMessages={[]}
                    showContentLink={false}
                    {...handlers}
                />
            </MemoryRouter>
        )
        const user = userEvent.setup()

        expect(screen.getByLabelText("Endereço da unidade")).toHaveAccessibleDescription(
            "Endereço da unidade obrigatório"
        )
        expect(screen.getByLabelText("Complemento ou referência (opcional)")).toHaveValue("Sala 2")
        await user.type(screen.getByLabelText("Endereço da unidade"), "R")
        await user.type(screen.getByLabelText("Complemento ou referência (opcional)"), "A")

        expect(handlers.onChangeAddress).toHaveBeenCalledWith("R")
        expect(handlers.onChangeComplement).toHaveBeenCalledWith("Sala 2A")
        expect(screen.queryByRole("link")).not.toBeInTheDocument()
        expect(
            screen.getByText(
                "Se você mudar horários ou endereço, revise as perguntas do Conteúdo que citam essas informações."
            )
        ).toBeInTheDocument()
    })
})
