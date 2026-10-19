import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"
import type AppointmentTimelineStep from "@/types/appointments/AppointmentTimelineStep.types"
import type TimelineStepLabel from "@/types/appointments/TimelineStepLabel.types"
import formatDate from "@/utils/formatDate"
import formatTime from "@/utils/formatTime"

type DetailKey = NonNullable<TimelineStepLabel["detailKey"]>
type Detail = Pick<TimelineStepLabel, "detailKey" | "values">
type Data = Record<string, unknown>
type Protocol = Pick<AppointmentDetail, "protocol">
type StepRule = {
    titleKey: TimelineStepLabel["titleKey"]
    detail: (data: Data, detail: Protocol) => Detail
}

const NO_DETAIL: Detail = { detailKey: null, values: {} }

function fixed(detailKey: DetailKey): () => Detail {
    return () => ({ detailKey, values: {} })
}

function textOf(data: Data, field: string): string | null {
    const value = data[field]

    return typeof value === "string" && value !== "" ? value : null
}

function titled(field: string, detailKey: DetailKey): (data: Data) => Detail {
    return (data) => {
        const title = textOf(data, field)

        return title === null ? NO_DETAIL : { detailKey, values: { title } }
    }
}

function choice(field: string, whenTrue: DetailKey, whenFalse: DetailKey): (data: Data) => Detail {
    return (data) => {
        const value = data[field]

        if (typeof value !== "boolean") {
            return NO_DETAIL
        }

        return { detailKey: value ? whenTrue : whenFalse, values: {} }
    }
}

function byValue(field: string, keys: Record<string, DetailKey>): (data: Data) => Detail {
    return (data) => {
        const value = textOf(data, field)
        const detailKey = value === null ? undefined : keys[value]

        return detailKey === undefined ? NO_DETAIL : { detailKey, values: {} }
    }
}

function dateParts(value: string | null): { date: string; time: string } | null {
    const date = value === null ? null : formatDate(value)

    if (value === null || date === null) {
        return null
    }

    return { date, time: formatTime(new Date(value)) }
}

function rescheduleDetail(data: Data): Detail {
    const from = dateParts(textOf(data, "from"))
    const to = dateParts(textOf(data, "to"))

    if (from === null || to === null) {
        return NO_DETAIL
    }

    return {
        detailKey: "timeline.details.rescheduled",
        values: { fromDate: from.date, fromTime: from.time, toDate: to.date, toTime: to.time }
    }
}

const RULES: Record<string, StepRule> = {
    STARTED: { titleKey: "timeline.titles.started", detail: fixed("timeline.details.started") },
    CATEGORY_CHOSEN: {
        titleKey: "timeline.titles.categoryChosen",
        detail: titled("category_title", "timeline.details.category")
    },
    QUESTION_CHOSEN: {
        titleKey: "timeline.titles.questionChosen",
        detail: titled("question_title", "timeline.details.question")
    },
    ANSWER_SENT: {
        titleKey: "timeline.titles.answerSent",
        detail: byValue("llm", {
            USED: "timeline.details.answerUsed",
            FAILED: "timeline.details.answerFailed"
        })
    },
    RESOLVED_ANSWERED: {
        titleKey: "timeline.titles.resolvedAnswered",
        detail: choice("resolved", "timeline.details.resolvedYes", "timeline.details.resolvedNo")
    },
    SCHEDULE_OFFERED: {
        titleKey: "timeline.titles.scheduleOffered",
        detail: byValue("reason", {
            REQUIRES_IN_PERSON: "timeline.details.offeredInPerson",
            NOT_RESOLVED: "timeline.details.offeredNotResolved"
        })
    },
    NO_SLOT: { titleKey: "timeline.titles.noSlot", detail: fixed("timeline.details.noSlot") },
    SCHEDULE_DECLINED: {
        titleKey: "timeline.titles.scheduleDeclined",
        detail: fixed("timeline.details.declined")
    },
    ATTENDEE_CHOSEN: {
        titleKey: "timeline.titles.attendeeChosen",
        detail: choice(
            "byRepresentative",
            "timeline.details.attendeeRepresentative",
            "timeline.details.attendeeHolder"
        )
    },
    PHONE_NOTICE_SHOWN: {
        titleKey: "timeline.titles.phoneNoticeShown",
        detail: fixed("timeline.details.phoneNotice")
    },
    APPOINTMENT_CREATED: {
        titleKey: "timeline.titles.appointmentCreated",
        detail: (_data, detail) => ({
            detailKey: "timeline.details.created",
            values: { protocol: detail.protocol }
        })
    },
    APPOINTMENT_CONSULTED: {
        titleKey: "timeline.titles.appointmentConsulted",
        detail: fixed("timeline.details.consulted")
    },
    APPOINTMENT_RESCHEDULED: {
        titleKey: "timeline.titles.appointmentRescheduled",
        detail: rescheduleDetail
    },
    APPOINTMENT_CANCELED: {
        titleKey: "timeline.titles.appointmentCanceled",
        detail: fixed("timeline.details.canceled")
    },
    ABANDONED: {
        titleKey: "timeline.titles.abandoned",
        detail: fixed("timeline.details.abandoned")
    }
}

function timelineStepLabel(step: AppointmentTimelineStep, detail: Protocol): TimelineStepLabel {
    const rule = Object.hasOwn(RULES, step.type) ? RULES[step.type] : undefined

    if (rule === undefined) {
        return { titleKey: "timeline.titles.unknown", ...NO_DETAIL }
    }

    return { titleKey: rule.titleKey, ...rule.detail(step.data, detail) }
}

export default timelineStepLabel
