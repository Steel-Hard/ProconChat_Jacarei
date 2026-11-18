import { describe, expect, test } from "vitest"
import { formatarConfirmacaoAgendamento, montarConfirmacaoAgendamento } from "./messageFormatter.service"

const base = {
    protocol: "A3F9C21B",
    quando: "quarta-feira, 07/10 às 09:30",
    unitAddress: "Rua do Procon, 100",
    byRepresentative: false,
    groupDocuments: ["RG"],
    questionDocuments: [],
    reminderHours: 24,
}

const PREFIXO = "Você receberá neste número avisos sobre este agendamento, como "

describe("frase de avisos da confirmação do agendamento", () => {
    test("lembrete ligado e aviso de cancelamento ligado citam os dois", () => {
        const estrutura = montarConfirmacaoAgendamento({ ...base, reminderEnabled: true, cancellationNoticeEnabled: true })

        expect(estrutura.notice).toBe(`${PREFIXO}um lembrete 24 horas antes do atendimento e o aviso em caso de cancelamento.`)
    })

    test("lembrete ligado e aviso de cancelamento desligado citam só o lembrete", () => {
        const estrutura = montarConfirmacaoAgendamento({ ...base, reminderEnabled: true, cancellationNoticeEnabled: false })

        expect(estrutura.notice).toBe(`${PREFIXO}um lembrete 24 horas antes do atendimento.`)
    })

    test("lembrete desligado e aviso de cancelamento ligado citam só o cancelamento", () => {
        const estrutura = montarConfirmacaoAgendamento({ ...base, reminderEnabled: false, cancellationNoticeEnabled: true })

        expect(estrutura.notice).toBe(`${PREFIXO}o aviso em caso de cancelamento.`)
    })

    test("com os dois desligados não há frase", () => {
        const estrutura = montarConfirmacaoAgendamento({ ...base, reminderEnabled: false, cancellationNoticeEnabled: false })

        expect(estrutura.notice).toBeNull()
    })

    test("com os dois desligados a mensagem termina nos documentos, sem linha em branco no fim", () => {
        const texto = formatarConfirmacaoAgendamento({ ...base, reminderEnabled: false, cancellationNoticeEnabled: false })

        expect(texto.endsWith("• RG")).toBe(true)
        expect(texto).not.toContain("Você receberá")
    })

    test("com um aviso ligado a frase vem depois de uma linha em branco", () => {
        const texto = formatarConfirmacaoAgendamento({ ...base, reminderEnabled: false, cancellationNoticeEnabled: true })

        expect(texto.endsWith(`• RG\n\n${PREFIXO}o aviso em caso de cancelamento.`)).toBe(true)
    })

    test("uma hora de antecedência vira 1 hora e não 1 horas", () => {
        const estrutura = montarConfirmacaoAgendamento({ ...base, reminderHours: 1, reminderEnabled: true, cancellationNoticeEnabled: false })

        expect(estrutura.notice).toBe(`${PREFIXO}um lembrete 1 hora antes do atendimento.`)
    })
})
