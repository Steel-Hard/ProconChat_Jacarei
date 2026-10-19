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
        ["CITIZEN_NOTIFIED", "Cidadão avisado pelo WhatsApp", "Cidadão avisado pelo WhatsApp"],
        [
            "CITIZEN_NOTIFICATION_FAILED",
            "Falha ao avisar o cidadão pelo WhatsApp",
            "Falha ao avisar o cidadão pelo WhatsApp"
        ],
        ["REMINDER_SENT", "Lembrete enviado pelo WhatsApp", "Lembrete enviado pelo WhatsApp"],
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
})
