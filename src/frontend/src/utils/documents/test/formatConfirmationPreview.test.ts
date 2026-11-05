import { describe, expect, it } from "vitest"
import formatConfirmationPreview from "@/utils/documents/formatConfirmationPreview"

describe("formatConfirmationPreview", () => {
    it("formata a mensagem para titular com lembrete ativado", () => {
        const text = formatConfirmationPreview({
            protocol: "ABC12345",
            quando: "Seg, 09/11 às 10:00",
            unitAddress: "Rua Central, 100",
            unitAddressComplement: "Sala 2",
            byRepresentative: false,
            groupDocuments: ["RG", "CPF"],
            questionDocuments: ["Comprovante de pagamento"],
            reminderEnabled: true,
            reminderHours: 24
        })

        expect(text).toContain("Agendamento realizado")
        expect(text).toContain("Protocolo: ABC12345")
        expect(text).toContain("Data e hora: Seg, 09/11 às 10:00")
        expect(text).toContain("Endereço: Rua Central, 100 (Sala 2)")
        expect(text).toContain("Leve ao atendimento:")
        expect(text).toContain("• RG")
        expect(text).toContain("• CPF")
        expect(text).toContain("Documentos úteis para esta dúvida:")
        expect(text).toContain("• Comprovante de pagamento")
        expect(text).toContain(
            "Você receberá neste número avisos sobre este agendamento, como um lembrete 24 horas antes do atendimento e o aviso em caso de cancelamento."
        )
    })

    it("formata a mensagem para representante com frase correspondente", () => {
        const text = formatConfirmationPreview({
            byRepresentative: true,
            groupDocuments: ["RG do titular", "Procuração"],
            questionDocuments: []
        })

        expect(text).toContain("A pessoa que comparecer em seu nome deve levar:")
        expect(text).toContain("• RG do titular")
        expect(text).toContain("• Procuração")
        expect(text).not.toContain("Documentos úteis para esta dúvida:")
    })

    it("usa texto com 1 hora no singular para lembrete de 1 hora", () => {
        const text = formatConfirmationPreview({
            byRepresentative: false,
            groupDocuments: ["RG"],
            questionDocuments: [],
            reminderEnabled: true,
            reminderHours: 1
        })

        expect(text).toContain("um lembrete 1 hora antes do atendimento")
    })

    it("cita só aviso de cancelamento se lembrete estiver desligado", () => {
        const text = formatConfirmationPreview({
            byRepresentative: false,
            groupDocuments: ["RG"],
            questionDocuments: [],
            reminderEnabled: false
        })

        expect(text).toContain(
            "Você receberá neste número avisos sobre este agendamento, como o aviso em caso de cancelamento."
        )
        expect(text).not.toContain("lembrete")
    })

    it("omite seção de grupo se não houver documentos no grupo", () => {
        const text = formatConfirmationPreview({
            byRepresentative: false,
            groupDocuments: [],
            questionDocuments: ["Contrato"]
        })

        expect(text).not.toContain("Leve ao atendimento:")
        expect(text).toContain("Documentos úteis para esta dúvida:")
        expect(text).toContain("• Contrato")
    })
})
