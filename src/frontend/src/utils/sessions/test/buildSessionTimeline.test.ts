import { describe, expect, it, vi } from "vitest"
import i18n from "@/i18n/i18n"
import buildSessionDetail, { buildTimelineItem } from "@/testUtils/buildSessionDetail"
import type SessionTranslate from "@/types/sessions/SessionTranslate.types"
import type { SessionDetail, SessionTimelineItem } from "@/types/sessions/Session.types"
import buildSessionTimeline from "@/utils/sessions/buildSessionTimeline"

const t: SessionTranslate = (key, values) =>
    i18n.t(key as never, { ns: "sessions", lng: "pt-BR", ...values } as never) as unknown as string

function build(
    outcome: SessionDetail["outcome"],
    timeline: SessionTimelineItem[],
    overrides: Partial<SessionDetail> = {},
    canOpenAppointment = true
) {
    const onOpenAppointment = vi.fn()
    const steps = buildSessionTimeline({
        detail: buildSessionDetail({ outcome, timeline, ...overrides }),
        t,
        canOpenAppointment,
        onOpenAppointment
    })

    return { steps, onOpenAppointment }
}

describe("buildSessionTimeline", () => {
    it("mostra a resposta oficial sem selo de IA e encerra a conversa resolvida", () => {
        const { steps } = build("RESOLVED", [
            buildTimelineItem("ANSWER_SENT", { data: { llm: "NOT_CALLED" } }),
            buildTimelineItem("RESOLVED_ANSWERED", { data: { resolved: true } })
        ])

        expect(steps.map((step) => step.title)).toEqual([
            "Resposta entregue",
            "A dúvida foi resolvida?",
            "Conversa encerrada"
        ])
        expect(steps[0]).toMatchObject({ detail: "Resposta do FAQ oficial.", ai: false })
        expect(steps[1]?.detail).toBe("Resposta do cidadão: Sim")
        expect(steps[2]?.detail).toBe("Dúvida resolvida sem agendamento.")
        expect(steps[2]?.tone).toEqual({ dot: "#3F8F63", ring: "#DFF1E6" })
    })

    it("registra a falha da IA como passo neutro depois da resposta", () => {
        const { steps } = build("RESOLVED", [
            buildTimelineItem("ANSWER_SENT", { data: { llm: "FAILED" } })
        ])

        expect(steps.map((step) => step.title)).toEqual([
            "Resposta entregue",
            "Complemento por IA indisponível · enviado apenas o texto oficial"
        ])
        expect(steps[1]?.tone).toEqual({ dot: "#8A869C", ring: "#EDECF1" })
        expect(steps.some((step) => step.ai)).toBe(false)
    })

    it("encerra a conversa fora do escopo depois da resposta", () => {
        const { steps } = build("OUT_OF_SCOPE", [
            buildTimelineItem("ANSWER_SENT", { data: { llm: "NOT_CALLED" } })
        ])

        expect(steps.map((step) => step.title)).toEqual(["Resposta entregue", "Conversa encerrada"])
        expect(steps[0]?.detail).toBe(
            "Informado que o assunto está fora do escopo do PROCON, com orientação de encaminhamento."
        )
        expect(steps[1]?.detail).toBe("Encaminhado a outro órgão. Nenhum agendamento oferecido.")
    })

    it("não encerra quando a dúvida não foi resolvida", () => {
        const { steps } = build("DECLINED", [
            buildTimelineItem("RESOLVED_ANSWERED", { data: { resolved: false } }),
            buildTimelineItem("SCHEDULE_OFFERED", { data: { reason: "NOT_RESOLVED" } }),
            buildTimelineItem("SCHEDULE_DECLINED")
        ])

        expect(steps.map((step) => step.title)).toEqual([
            "A dúvida foi resolvida?",
            "Agendamento oferecido",
            "O cidadão preferiu não agendar"
        ])
        expect(steps[0]?.detail).toBe("Resposta do cidadão: Não")
        expect(steps[2]?.tone).toEqual({ dot: "#D99A1E", ring: "#FCEFD6" })
    })

    it("explica o atendimento presencial antes da oferta", () => {
        const { steps } = build("NO_SLOT", [
            buildTimelineItem("SCHEDULE_OFFERED", { data: { reason: "REQUIRES_IN_PERSON" } }),
            buildTimelineItem("NO_SLOT")
        ])

        expect(steps.map((step) => step.title)).toEqual([
            "A pergunta exige atendimento presencial",
            "Agendamento oferecido",
            "Não havia horário disponível na janela de agendamento"
        ])
        expect(steps[1]?.detail).toBe("Motivo: a pergunta exige atendimento presencial.")
        expect(steps[2]?.detail).toBe(
            "O cidadão foi informado de que não há horários disponíveis no momento."
        )
    })

    it("descreve titular, representante e o aviso do número", () => {
        const { steps } = build("SCHEDULED", [
            buildTimelineItem("ATTENDEE_CHOSEN", { data: { by_representative: false } }),
            buildTimelineItem("ATTENDEE_CHOSEN", { data: { by_representative: true } }),
            buildTimelineItem("PHONE_NOTICE_SHOWN")
        ])

        expect(steps.map((step) => step.detail)).toEqual([
            "Titular",
            "Representante, em nome do titular",
            "Mensagens de modelo fixo enviadas pelo WhatsApp."
        ])
        expect(steps[2]?.title).toBe(
            "Informado de que receberá avisos sobre o agendamento neste número (lembrete e cancelamento)"
        )
    })

    it("liga o agendamento criado e o consultado ao botão de abrir só com permissão", () => {
        const items = [
            buildTimelineItem("APPOINTMENT_CONSULTED", {
                appointment: { id: "42", protocol: "AB12CD34" }
            }),
            buildTimelineItem("APPOINTMENT_CREATED", {
                appointment: { id: "42", protocol: "AB12CD34" }
            })
        ]
        const allowed = build("SCHEDULED", items)
        const denied = build("SCHEDULED", items, {}, false)

        expect(allowed.steps[0]?.title).toBe("Consultou o agendamento AB12CD34")
        expect(allowed.steps[1]?.detail).toBe("Protocolo AB12CD34")
        expect(allowed.steps[1]?.action?.label).toBe("Abrir agendamento AB12CD34")
        allowed.steps[1]?.action?.onClick()
        expect(allowed.onOpenAppointment).toHaveBeenCalledWith("42")
        expect(denied.steps.every((step) => step.action === undefined)).toBe(true)
    })

    it("descreve a remarcação com as datas no horário de Brasília e o cancelamento", () => {
        const { steps } = build("MANAGED_APPOINTMENT", [
            buildTimelineItem("APPOINTMENT_RESCHEDULED", {
                data: { from: "2026-11-20T13:00:00.000Z", to: "2026-11-25T17:30:00.000Z" }
            }),
            buildTimelineItem("APPOINTMENT_CANCELED")
        ])

        expect(steps[0]?.title).toBe("Remarcou de 20/11/2026 às 10:00 para 25/11/2026 às 14:30")
        expect(steps[0]?.tone).toEqual({ dot: "#6FA8A0", ring: "#DDF0EE" })
        expect(steps[1]?.title).toBe("Cancelou o agendamento")
        expect(steps[1]?.detail).toBe("O horário voltou a ficar disponível no chatbot.")
    })

    it("mostra onde a conversa abandonada parou", () => {
        const { steps } = build("ABANDONED", [
            buildTimelineItem("ABANDONED", { data: { step: "AWAITING_HOLDER_CPF" } })
        ])

        expect(steps[0]).toMatchObject({
            title: "Parou no CPF do titular",
            detail: "Sem interação por mais de 30 minutos nesta etapa."
        })
        expect(steps[0]?.tone).toEqual({ dot: "#C98A7E", ring: "#F6E6E2" })
    })

    it("acrescenta a espera do cidadão nas conversas em andamento", () => {
        const { steps } = build(
            "IN_PROGRESS",
            [buildTimelineItem("STARTED")],
            { current_step: "AWAITING_QUESTION" },
            true
        )

        expect(steps.at(-1)).toMatchObject({
            title: "Aguardando o cidadão",
            detail: "Etapa atual: Na lista de perguntas.",
            time: "14:05"
        })
    })

    it("mostra o tipo bruto quando o passo é desconhecido e numera os passos", () => {
        const { steps } = build("RESOLVED", [buildTimelineItem("NOVO_TIPO")])

        expect(steps).toEqual([
            { id: "0", title: "NOVO_TIPO", detail: null, ai: false, time: "14:05" }
        ])
    })
})
