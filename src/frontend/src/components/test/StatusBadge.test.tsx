import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import StatusBadge from "@/components/StatusBadge"
import type AppointmentStatus from "@/types/status/AppointmentStatus.types"
import type ConversationOutcome from "@/types/status/ConversationOutcome.types"

describe("StatusBadge", () => {
    it.each<[AppointmentStatus, string]>([
        ["PENDING", "Pendente"],
        ["CONFIRMED", "Confirmado"],
        ["ATTENDED", "Atendido"],
        ["NO_SHOW", "Não compareceu"],
        ["CANCELED", "Cancelado"]
    ])("mostra o rótulo do agendamento %s", (status, label) => {
        render(<StatusBadge kind="appointment" status={status} />)

        expect(screen.getByText(label)).toBeInTheDocument()
    })

    it.each<[ConversationOutcome, string]>([
        ["RESOLVED", "Resolvida sem agendamento"],
        ["SCHEDULED", "Terminou em agendamento"],
        ["OUT_OF_SCOPE", "Fora do escopo do PROCON"],
        ["NO_SLOT", "Sem horário disponível na janela"],
        ["DECLINED", "Não quis agendar"],
        ["MANAGED_APPOINTMENT", "Remarcou ou cancelou agendamento existente"],
        ["ABANDONED", "Abandonada"],
        ["IN_PROGRESS", "Em andamento"]
    ])("mostra o rótulo do desfecho %s", (status, label) => {
        render(<StatusBadge kind="outcome" status={status} />)

        expect(screen.getByText(label)).toBeInTheDocument()
    })
})
