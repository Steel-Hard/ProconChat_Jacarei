import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import StatusBadge from "@/components/StatusBadge"
import type AppointmentStatus from "@/types/status/AppointmentStatus.types"
import type ConversationOutcome from "@/types/status/ConversationOutcome.types"
import type WhatsAppStatus from "@/types/status/WhatsAppStatus.types"

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

    it.each<[WhatsAppStatus, string, string, string]>([
        ["OPERATING", "Operando", "#DFF1E6", "#1B6138"],
        ["PAUSED", "Respostas pausadas", "#FCEFD6", "#7A4F00"],
        ["INVALID_CREDENTIALS", "Credenciais inválidas", "#FAE3E0", "#8E2C22"],
        ["NOT_VERIFIED", "Não verificado", "#EDECF1", "#55516A"],
        ["NOT_CONFIGURED", "Não configurado", "#EDECF1", "#55516A"]
    ])("mostra a situação do WhatsApp %s com o rótulo e as cores", (status, label, bg, fg) => {
        render(<StatusBadge kind="whatsapp" status={status} />)

        expect(screen.getByText(label)).toHaveStyle({ backgroundColor: bg, color: fg })
    })
    it.each<[WhatsAppStatus, string]>([
        ["OPERATING", "Operando"],
        ["PAUSED", "Respostas pausadas"],
        ["INVALID_CREDENTIALS", "Credenciais inválidas"]
    ])("mostra a bolinha decorativa na situação do WhatsApp %s", (status, label) => {
        render(<StatusBadge kind="whatsapp" status={status} />)

        expect(screen.getByText(label).querySelector('[aria-hidden="true"]')).not.toBeNull()
    })
    it("não mostra bolinha nos selos de agendamento e de desfecho", () => {
        render(
            <>
                <StatusBadge kind="appointment" status="CONFIRMED" />
                <StatusBadge kind="outcome" status="RESOLVED" />
            </>
        )

        expect(screen.getByText("Confirmado").querySelector('[aria-hidden="true"]')).toBeNull()
        expect(
            screen.getByText("Resolvida sem agendamento").querySelector('[aria-hidden="true"]')
        ).toBeNull()
    })
    it.each<[WhatsAppStatus, string]>([
        ["NOT_VERIFIED", "Não verificado"],
        ["NOT_CONFIGURED", "Não configurado"]
    ])("mostra a bolinha cinza na situação do WhatsApp %s", (status, label) => {
        render(<StatusBadge kind="whatsapp" status={status} />)

        expect(screen.getByText(label).querySelector('[aria-hidden="true"]')).toHaveStyle({
            backgroundColor: "#8A869C"
        })
    })
})
