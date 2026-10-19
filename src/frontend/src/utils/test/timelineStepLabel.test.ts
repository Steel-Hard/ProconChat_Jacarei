import { describe, expect, it } from "vitest"
import i18n from "@/i18n/i18n"
import type AppointmentTimelineStep from "@/types/appointments/AppointmentTimelineStep.types"
import timelineStepLabel from "@/utils/timelineStepLabel"

const DETAIL = { protocol: "F10464F0" }

function step(type: string, data: Record<string, unknown> = {}): AppointmentTimelineStep {
    return { id: "1", type, created_at: "2026-10-18T13:46:04.464Z", generated_by_ai: false, data }
}

function render(value: AppointmentTimelineStep): { title: string; detail: string | null } {
    const label = timelineStepLabel(value, DETAIL)
    const options = { ns: "appointmentDetail", lng: "pt-BR", ...label.values } as const

    return {
        title: i18n.t(label.titleKey, options),
        detail: label.detailKey === null ? null : i18n.t(label.detailKey, options)
    }
}

describe("timelineStepLabel", () => {
    it.each([
        [
            "STARTED",
            {},
            "Início da conversa",
            "Cidadão iniciou o atendimento pelo WhatsApp e recebeu o aviso de que as orientações não têm caráter jurídico vinculante."
        ],
        [
            "CATEGORY_CHOSEN",
            { category_title: "Cobrança/Desconto Indevido" },
            "Categoria escolhida",
            "Cobrança/Desconto Indevido"
        ],
        [
            "QUESTION_CHOSEN",
            { question_title: "Prescrição de dívida" },
            "Pergunta escolhida",
            "Prescrição de dívida"
        ],
        [
            "ANSWER_SENT",
            { llm: "USED" },
            "Resposta entregue",
            "Texto complementar gerado para contextualizar a resposta."
        ],
        [
            "ANSWER_SENT",
            { llm: "FAILED" },
            "Resposta entregue",
            "Complemento por IA indisponível · enviado apenas o texto oficial."
        ],
        ["ANSWER_SENT", { llm: "NOT_CALLED" }, "Resposta entregue", null],
        [
            "RESOLVED_ANSWERED",
            { resolved: true },
            "A dúvida foi resolvida?",
            "Resposta do cidadão: Sim"
        ],
        [
            "RESOLVED_ANSWERED",
            { resolved: false },
            "A dúvida foi resolvida?",
            "Resposta do cidadão: Não"
        ],
        [
            "SCHEDULE_OFFERED",
            { reason: "REQUIRES_IN_PERSON" },
            "Agendamento oferecido",
            "Motivo: a pergunta exige atendimento presencial."
        ],
        [
            "SCHEDULE_OFFERED",
            { reason: "NOT_RESOLVED" },
            "Agendamento oferecido",
            "Motivo: o cidadão respondeu que a dúvida não foi resolvida."
        ],
        [
            "NO_SLOT",
            {},
            "Não havia horário disponível na janela de agendamento",
            "O cidadão foi informado de que não há horários disponíveis no momento."
        ],
        [
            "SCHEDULE_DECLINED",
            {},
            "O cidadão preferiu não agendar",
            "Conversa encerrada sem agendamento."
        ],
        ["ATTENDEE_CHOSEN", { byRepresentative: false }, "Escolheu quem vai comparecer", "Titular"],
        [
            "ATTENDEE_CHOSEN",
            { byRepresentative: true },
            "Escolheu quem vai comparecer",
            "Representante, em nome do titular"
        ],
        [
            "PHONE_NOTICE_SHOWN",
            {},
            "Informado de que receberá avisos sobre o agendamento neste número (lembrete e cancelamento)",
            "Mensagens de modelo fixo enviadas pelo WhatsApp."
        ],
        ["APPOINTMENT_CREATED", { appointmentId: 1 }, "Agendamento criado", "Protocolo F10464F0"],
        [
            "APPOINTMENT_CONSULTED",
            {},
            "Consultou o agendamento",
            "Conversa de retorno para um agendamento existente."
        ],
        [
            "APPOINTMENT_RESCHEDULED",
            { from: "2026-10-19T11:00:00.000Z", to: "2026-10-21T17:30:00.000Z" },
            "Remarcou o agendamento",
            "De 19/10/2026 às 08:00 para 21/10/2026 às 14:30"
        ],
        [
            "APPOINTMENT_CANCELED",
            {},
            "Cancelou o agendamento",
            "O horário voltou a ficar disponível no chatbot."
        ],
        [
            "ABANDONED",
            { step: "AWAITING_CATEGORY" },
            "Conversa abandonada",
            "Sem interação por mais de 30 minutos nesta etapa."
        ],
        ["SOMETHING_NEW", { category_title: "x" }, "Passo registrado", null]
    ])("monta %s com %j", (type, data, title, detail) => {
        const label = render(step(type, data))

        expect(label).toEqual({ title, detail })
    })

    it.each([
        ["CATEGORY_CHOSEN", { category_title: 3 }],
        ["CATEGORY_CHOSEN", {}],
        ["QUESTION_CHOSEN", { question_title: null }],
        ["ANSWER_SENT", {}],
        ["RESOLVED_ANSWERED", { resolved: "true" }],
        ["SCHEDULE_OFFERED", { reason: "OTHER" }],
        ["ATTENDEE_CHOSEN", { byRepresentative: "sim" }],
        ["APPOINTMENT_RESCHEDULED", { from: "2026-10-19T11:00:00.000Z" }],
        ["APPOINTMENT_RESCHEDULED", { from: "ontem", to: "2026-10-21T17:30:00.000Z" }]
    ])("mostra %s sem detalhe quando data %j não serve", (type, data) => {
        const label = render(step(type, data))

        expect(label.detail).toBeNull()
    })
})
