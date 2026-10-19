import type resources from "@/i18n/resources"
import type AppointmentEvent from "@/types/appointments/AppointmentEvent.types"
import type AppointmentEventLabel from "@/types/appointments/AppointmentEventLabel.types"
import type AppointmentEventType from "@/types/appointments/AppointmentEventType.types"

type EventKey = keyof (typeof resources)["pt-BR"]["appointmentDetail"]["history"]["events"]

const EVENT_KEYS: Record<AppointmentEventType, EventKey> = {
    CREATED: "created",
    CLAIMED: "claimed",
    ASSIGNED: "assigned",
    RESCHEDULED: "rescheduled",
    BACK_TO_PENDING: "backToPending",
    ATTENDED: "attended",
    NO_SHOW: "noShow",
    RECORD_CORRECTED: "recordCorrected",
    CANCELED_BY_CITIZEN: "canceledByCitizen",
    CANCELED_BY_STAFF: "canceledByStaff",
    CITIZEN_NOTIFIED: "citizenNotified",
    CITIZEN_NOTIFICATION_FAILED: "citizenNotificationFailed",
    REMINDER_SENT: "reminderSent",
    KEPT_OFF_GRID: "keptOffGrid"
}

function eventKeyOf(event: AppointmentEvent): EventKey {
    if (!Object.hasOwn(EVENT_KEYS, event.type)) {
        return "unknown"
    }

    if (event.type === "CLAIMED" && event.data.auto_claimed === true) {
        return "autoClaimed"
    }

    return EVENT_KEYS[event.type]
}

function appointmentEventLabel(event: AppointmentEvent): AppointmentEventLabel {
    const name = event.actor_user_name
    const variant = name === null ? "withoutActor" : "withActor"

    return {
        key: `history.events.${eventKeyOf(event)}.${variant}`,
        values: name === null ? {} : { name },
        highlight: event.type === "CITIZEN_NOTIFICATION_FAILED"
    }
}

export default appointmentEventLabel
