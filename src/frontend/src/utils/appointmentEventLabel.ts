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
    CITIZEN_NOTICE_DISABLED: "noticeDisabled",
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

    if (event.type === "CITIZEN_NOTIFICATION_FAILED" && event.data.kind === "REMINDER") {
        return "reminderFailed"
    }

    return EVENT_KEYS[event.type]
}

const META_ERROR_CODES = [
    "131042",
    "132001",
    "132000",
    "132012",
    "132007",
    "132015",
    "132016",
    "132005",
    "190",
    "131048",
    "131026",
    "131049",
    "131056",
    "131047"
] as const

type MetaErrorCode = (typeof META_ERROR_CODES)[number]

function isMetaErrorCode(code: unknown): code is MetaErrorCode {
    return META_ERROR_CODES.some((known) => known === code)
}

function detailKeyOf(event: AppointmentEvent): AppointmentEventLabel["detailKey"] {
    const code = event.data.errorCode

    if (event.type !== "CITIZEN_NOTIFICATION_FAILED" || !isMetaErrorCode(code)) {
        return null
    }

    return `history.metaErrors.${code}`
}

function appointmentEventLabel(event: AppointmentEvent): AppointmentEventLabel {
    const name = event.actor_user_name
    const variant = name === null ? "withoutActor" : "withActor"

    return {
        key: `history.events.${eventKeyOf(event)}.${variant}`,
        values: name === null ? {} : { name },
        highlight: event.type === "CITIZEN_NOTIFICATION_FAILED",
        retryable:
            event.type === "CITIZEN_NOTIFICATION_FAILED" && event.data.kind === "CANCELLATION",
        muted: event.type === "CITIZEN_NOTICE_DISABLED",
        detailKey: detailKeyOf(event)
    }
}

export default appointmentEventLabel
