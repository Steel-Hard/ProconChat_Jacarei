import { describe, expect, it } from "vitest"
import {
    ConfirmacaoAgendamentoInput,
    formatarConfirmacaoAgendamento,
    montarConfirmacaoAgendamento
} from "./messageFormatter.service"

function input(overrides: Partial<ConfirmacaoAgendamentoInput> = {}): ConfirmacaoAgendamentoInput {
    return {
        protocol: "A3F9C21B",
        quando: "Ter, 10/11 às 14:00",
        unitAddress: "Rua Central, 100",
        unitAddressComplement: "Sala 2",
        byRepresentative: false,
        groupDocuments: ["RG ou outro documento oficial com foto", "CPF"],
        questionDocuments: ["RG", "Nota fiscal"],
        reminderEnabled: true,
        reminderHours: 24,
        cancellationNoticeEnabled: true,
        ...overrides
    }
}

describe("montarConfirmacaoAgendamento", () => {
    it("devolve título, detalhes, blocos e aviso da mensagem de confirmação", () => {
        const resultado = montarConfirmacaoAgendamento(input())

        expect(resultado.title).toBe("Agendamento realizado")
        expect(resultado.details).toEqual([
            { label: "Protocolo", value: "A3F9C21B" },
            { label: "Data e hora", value: "Ter, 10/11 às 14:00" },
            { label: "Endereço", value: "Rua Central, 100 (Sala 2)" }
        ])
        expect(resultado.groupBlock?.heading).toBe("Leve ao atendimento:")
        expect(resultado.questionBlock?.heading).toBe("Documentos úteis para esta dúvida:")
        expect(resultado.notice).toContain("lembrete 24 horas antes do atendimento")
    })

    it("marca como repetido o item que aparece nas duas listas e conta os repetidos", () => {
        const resultado = montarConfirmacaoAgendamento(input())

        expect(resultado.groupBlock?.items).toEqual([
            { text: "RG ou outro documento oficial com foto", repeated: true },
            { text: "CPF", repeated: false }
        ])
        expect(resultado.questionBlock?.items).toEqual([
            { text: "RG", repeated: true },
            { text: "Nota fiscal", repeated: false }
        ])
        expect(resultado.repeatedCount).toBe(1)
    })

    it("conta os itens repetidos do grupo, não os da pergunta", () => {
        const resultado = montarConfirmacaoAgendamento(
            input({
                groupDocuments: ["RG", "CPF"],
                questionDocuments: ["RG", "RG ou outro documento oficial com foto", "Nota fiscal"]
            })
        )

        expect(resultado.questionBlock?.items.filter((item) => item.repeated)).toHaveLength(2)
        expect(resultado.repeatedCount).toBe(1)
    })

    it("devolve bloco nulo quando a lista está vazia e usa o título do representante", () => {
        const resultado = montarConfirmacaoAgendamento(
            input({ groupDocuments: ["CPF"], questionDocuments: [], byRepresentative: true })
        )

        expect(resultado.groupBlock?.heading).toBe(
            "A pessoa que comparecer em seu nome deve levar:"
        )
        expect(resultado.questionBlock).toBeNull()
        expect(resultado.repeatedCount).toBe(0)
    })

    it("cita só o aviso de cancelamento quando o lembrete está desligado", () => {
        const resultado = montarConfirmacaoAgendamento(input({ reminderEnabled: false }))

        expect(resultado.notice).not.toContain("lembrete")
    })
})

describe("formatarConfirmacaoAgendamento", () => {
    it("monta o texto do bot a partir da mesma estrutura", () => {
        expect(formatarConfirmacaoAgendamento(input())).toBe(
            [
                "Agendamento realizado",
                "Protocolo: A3F9C21B",
                "Data e hora: Ter, 10/11 às 14:00",
                "Endereço: Rua Central, 100 (Sala 2)",
                "",
                "Leve ao atendimento:",
                "• RG ou outro documento oficial com foto",
                "• CPF",
                "",
                "Documentos úteis para esta dúvida:",
                "• RG",
                "• Nota fiscal",
                "",
                montarConfirmacaoAgendamento(input()).notice
            ].join("\n")
        )
    })
})
