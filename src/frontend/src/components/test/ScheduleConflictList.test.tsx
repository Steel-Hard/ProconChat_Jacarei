import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import ScheduleConflictList from "@/components/ScheduleConflictList"
import type ScheduleConflictRowView from "@/types/schedule/ScheduleConflictRowView.types"

const FROM_PREVIEW: ScheduleConflictRowView = {
    protocol: "A1B2C3D4",
    date: "2026-11-04",
    time: "09:00",
    status: "CONFIRMED",
    code: "RANGE_CHANGED",
    reason: "Faixa de horário removida ou alterada"
}

const FROM_SAVE: ScheduleConflictRowView = {
    ...FROM_PREVIEW,
    protocol: "E5F6A7B8",
    code: "DATE_BLOCKED",
    status: "PENDING",
    reason: "Data bloqueada: Feriado",
    name: "Maria Souza",
    cpfMasked: "***.982.247-**"
}

describe("ScheduleConflictList", () => {
    it.each([
        [[FROM_PREVIEW], "Esta alteração afeta 1 agendamento"],
        [[FROM_PREVIEW, FROM_SAVE], "Esta alteração afeta 2 agendamentos"]
    ])("mostra o título com o plural certo", (conflicts, title) => {
        render(<ScheduleConflictList conflicts={conflicts} canCancelAppointments />)

        expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
    })

    it("mostra o item do salvamento com nome, CPF mascarado, protocolo, quando, status e motivo", () => {
        render(<ScheduleConflictList conflicts={[FROM_SAVE]} canCancelAppointments />)

        const row = screen.getByRole("listitem")
        expect(within(row).getByText("Maria Souza")).toBeInTheDocument()
        expect(within(row).getByText("***.982.247-**")).toBeInTheDocument()
        expect(within(row).getByText("Protocolo E5F6A7B8")).toBeInTheDocument()
        expect(within(row).getByText("Quarta-feira, 04/11 às 09:00")).toBeInTheDocument()
        expect(within(row).getByText("Pendente")).toBeInTheDocument()
        expect(within(row).getByText("Data bloqueada: Feriado")).toBeInTheDocument()
    })

    it("mostra o item da prévia sem nome nem CPF", () => {
        render(<ScheduleConflictList conflicts={[FROM_PREVIEW]} canCancelAppointments />)

        const row = screen.getByRole("listitem")
        expect(within(row).getByText("Protocolo A1B2C3D4")).toBeInTheDocument()
        expect(within(row).getByText("Quarta-feira, 04/11 às 09:00")).toBeInTheDocument()
        expect(within(row).getByText("Confirmado")).toBeInTheDocument()
        expect(within(row).getByText("Faixa de horário removida ou alterada")).toBeInTheDocument()
        expect(within(row).queryByText(/\*\*\*/)).not.toBeInTheDocument()
        expect(row.querySelectorAll("span")).toHaveLength(2)
    })

    it("mostra o protocolo como texto e não oferece manter nem cancelar", () => {
        render(<ScheduleConflictList conflicts={[FROM_SAVE]} canCancelAppointments />)

        expect(screen.queryByRole("link")).not.toBeInTheDocument()
        expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("com as duas permissões diz que dá para manter ou cancelar", () => {
        render(<ScheduleConflictList conflicts={[FROM_SAVE]} canCancelAppointments />)

        expect(
            screen.getByText(
                "Ao salvar, você poderá manter estes agendamentos fora da grade atual ou cancelá-los."
            )
        ).toBeInTheDocument()
    })

    it("só com Configurar atendimento presencial diz que dá para manter e pede a quem gerencia para cancelar", () => {
        render(<ScheduleConflictList conflicts={[FROM_SAVE]} canCancelAppointments={false} />)

        expect(
            screen.getByText(
                "Ao salvar, você poderá manter estes agendamentos fora da grade atual. Para cancelá-los, peça a quem gerencia os agendamentos."
            )
        ).toBeInTheDocument()
        expect(screen.queryByText(/ou cancelá-los/)).not.toBeInTheDocument()
    })
})
