import { describe, expect, it } from "vitest"
import i18n from "@/i18n/i18n"
import type AppointmentEvent from "@/types/appointments/AppointmentEvent.types"
import appointmentEventLabel from "@/utils/appointmentEventLabel"

function event(
    type: string,
    actor: string | null,
    data: Record<string, unknown> = {}
): AppointmentEvent {
    return {
        id: "1",
        type: type as AppointmentEvent["type"],
        actor_user_id: actor === null ? null : "1",
        actor_user_name: actor,
        data,
        created_at: "2026-10-18T13:46:05.141Z"
    }
}

function render(value: AppointmentEvent): string {
    const label = appointmentEventLabel(value)

    return i18n.t(label.key, { ns: "appointmentDetail", lng: "pt-BR", ...label.values })
}

describe("appointmentEventLabel", () => {
    it.each([
        ["CREATED", "Criado pelo chatbot como Pendente", "Criado pelo chatbot como Pendente"],
        ["CLAIMED", "Assumido por Ana · Confirmado", "Assumido · Confirmado"],
        ["ATTENDED", "Marcado como atendido por Ana", "Marcado como atendido"],
        ["NO_SHOW", "Marcado como não compareceu por Ana", "Marcado como não compareceu"],
        ["ASSIGNED", "Atribuído por Ana · Confirmado", "Atribuído · Confirmado"],
        ["RESCHEDULED", "Remarcado pelo cidadão no chatbot", "Remarcado pelo cidadão no chatbot"],
        [
            "BACK_TO_PENDING",
            "Voltou para Pendente sem responsável",
            "Voltou para Pendente sem responsável"
        ],
        ["RECORD_CORRECTED", "Registro corrigido por Ana", "Registro corrigido"],
        [
            "CANCELED_BY_CITIZEN",
            "Cancelado pelo cidadão no chatbot",
            "Cancelado pelo cidadão no chatbot"
        ],
        ["CANCELED_BY_STAFF", "Cancelado no painel por Ana", "Cancelado no painel"],
        ["CITIZEN_NOTIFIED", "Cidadão avisado do cancelamento", "Cidadão avisado do cancelamento"],
        [
            "CITIZEN_NOTIFICATION_FAILED",
            "Falha ao avisar o cidadão do cancelamento",
            "Falha ao avisar o cidadão do cancelamento"
        ],
        ["REMINDER_SENT", "Lembrete enviado", "Lembrete enviado"],
        [
            "KEPT_OFF_GRID",
            "Mantido fora da grade atual após alteração de horários",
            "Mantido fora da grade atual após alteração de horários"
        ],
        ["SOMETHING_NEW", "Evento registrado", "Evento registrado"]
    ])("monta %s com e sem quem fez", (type, withActor, withoutActor) => {
        const texts = [render(event(type, "Ana")), render(event(type, null))]

        expect(texts).toEqual([withActor, withoutActor])
    })

    it("monta o CLAIMED automático com o nome de quem confirmou", () => {
        const text = render(event("CLAIMED", "Ana", { auto_claimed: true }))

        expect(text).toBe("Assumido automaticamente por Ana · Confirmado")
    })

    it("monta o CLAIMED automático sem nome na variante sem quem fez", () => {
        const text = render(event("CLAIMED", null, { auto_claimed: true }))

        expect(text).toBe("Assumido · Confirmado")
    })

    it("ignora auto_claimed que não é true", () => {
        const text = render(event("CLAIMED", "Ana", { auto_claimed: "true" }))

        expect(text).toBe("Assumido por Ana · Confirmado")
    })

    it("destaca só a falha ao avisar o cidadão", () => {
        const highlights = ["CITIZEN_NOTIFICATION_FAILED", "CITIZEN_NOTIFIED", "CREATED"].map(
            (type) => appointmentEventLabel(event(type, null)).highlight
        )

        expect(highlights).toEqual([true, false, false])
    })

    it("distingue a falha do lembrete da falha do aviso de cancelamento", () => {
        const reminder = event("CITIZEN_NOTIFICATION_FAILED", null, { kind: "REMINDER" })
        const cancellation = event("CITIZEN_NOTIFICATION_FAILED", null, { kind: "CANCELLATION" })

        expect(render(reminder)).toBe("Falha ao avisar o cidadão do lembrete")
        expect(render(cancellation)).toBe("Falha ao avisar o cidadão do cancelamento")
    })

    it("só permite tentar de novo na falha do aviso de cancelamento", () => {
        const flags = [
            event("CITIZEN_NOTIFICATION_FAILED", null, { kind: "CANCELLATION" }),
            event("CITIZEN_NOTIFICATION_FAILED", null, { kind: "REMINDER" }),
            event("CITIZEN_NOTIFICATION_FAILED", null),
            event("CITIZEN_NOTIFIED", null, { kind: "CANCELLATION" })
        ].map((value) => {
            const label = appointmentEventLabel(value)

            return [label.highlight, label.retryable]
        })

        expect(flags).toEqual([
            [true, true],
            [true, false],
            [true, false],
            [false, false]
        ])
    })

    it("monta o evento de aviso desativado em estilo neutro, sem destaque nem retry", () => {
        const label = appointmentEventLabel(event("CITIZEN_NOTICE_DISABLED", null))

        expect(render(event("CITIZEN_NOTICE_DISABLED", null))).toBe(
            "Aviso ao cidadão desativado: cidadão não avisado pelo sistema"
        )
        expect(label).toMatchObject({ highlight: false, retryable: false, muted: true })
    })

    it("não marca como neutros os demais eventos", () => {
        expect(appointmentEventLabel(event("CITIZEN_NOTIFICATION_FAILED", null)).muted).toBe(false)
        expect(appointmentEventLabel(event("CREATED", null)).muted).toBe(false)
    })

    it.each([
        ["131042", "A conta da Meta está sem forma de pagamento."],
        ["132001", "O modelo da mensagem não existe no idioma usado ou não está aprovado na Meta."],
        [
            "131026",
            "Mensagem não entregável: o número pode não ter WhatsApp, não ter aceitado os termos ou estar com o aplicativo desatualizado."
        ],
        ["131049", "Limite de engajamento do usuário: esperar 24 horas e não insistir."],
        ["131056", "Muitos envios ao mesmo destinatário."],
        ["131047", "Fora da janela de 24 horas."]
    ])("traduz o código %s da Meta no motivo da falha", (code, text) => {
        const label = appointmentEventLabel(
            event("CITIZEN_NOTIFICATION_FAILED", null, { kind: "CANCELLATION", errorCode: code })
        )

        expect(label.detailKey).not.toBeNull()
        expect(
            i18n.t(label.detailKey as NonNullable<typeof label.detailKey>, {
                ns: "appointmentDetail",
                lng: "pt-BR"
            })
        ).toBe(text)
    })

    it("não mostra motivo quando o código é desconhecido ou não veio", () => {
        expect(
            appointmentEventLabel(
                event("CITIZEN_NOTIFICATION_FAILED", null, {
                    kind: "CANCELLATION",
                    errorCode: "999999"
                })
            ).detailKey
        ).toBeNull()
        expect(
            appointmentEventLabel(
                event("CITIZEN_NOTIFICATION_FAILED", null, { kind: "CANCELLATION" })
            ).detailKey
        ).toBeNull()
    })
})
