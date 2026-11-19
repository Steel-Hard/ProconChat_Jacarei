import CONVERSATION_OUTCOME from "@/status/conversationOutcomeStyles"
import type SessionTranslate from "@/types/sessions/SessionTranslate.types"
import type AppointmentTimelineStepView from "@/types/appointments/AppointmentTimelineStepView.types"
import type { SessionDetail, SessionOutcome } from "@/types/sessions/Session.types"
import formatDate from "@/utils/formatDate"
import formatTime from "@/utils/formatTime"

type Options = {
    detail: SessionDetail
    t: SessionTranslate
    canOpenAppointment: boolean
    onOpenAppointment: (appointmentId: string) => void
}

type Step = Omit<AppointmentTimelineStepView, "id" | "time">

const NEUTRAL_TONE = { dot: "#8A869C", ring: "#EDECF1" }

function toneOf(outcome: SessionOutcome): Step["tone"] {
    const style = CONVERSATION_OUTCOME[outcome]

    return { dot: style.chart, ring: style.bg }
}

function textOf(data: Record<string, unknown>, field: string): string {
    const value = data[field]

    return typeof value === "string" ? value : ""
}

function formatTimePart(value: string): string {
    return formatTime(new Date(value))
}

function dayAndTime(value: string): { date: string; time: string } {
    return { date: formatDate(value) ?? "", time: formatTimePart(value) }
}

function buildSessionTimeline({
    detail,
    t,
    canOpenAppointment,
    onOpenAppointment
}: Options): AppointmentTimelineStepView[] {
    const result: AppointmentTimelineStepView[] = []

    function push(step: Step, time: string) {
        result.push({ ...step, id: `${result.length}`, time })
    }

    function openAction(item: SessionDetail["timeline"][number]): Step["action"] {
        if (!canOpenAppointment || item.appointment === null) {
            return undefined
        }

        const appointmentId = item.appointment.id

        return {
            label: t("timeline.openAppointment", { protocol: item.appointment.protocol }),
            onClick: () => onOpenAppointment(appointmentId)
        }
    }

    for (const item of detail.timeline) {
        const time = formatTimePart(item.created_at)
        const data = item.data
        const protocol = item.appointment?.protocol ?? ""

        if (item.type === "STARTED") {
            push(
                {
                    title: t("timeline.started.title"),
                    detail: t("timeline.started.detail"),
                    ai: false
                },
                time
            )
        } else if (item.type === "CATEGORY_CHOSEN") {
            push(
                {
                    title: t("timeline.categoryChosen"),
                    detail: item.category_name,
                    ai: false
                },
                time
            )
        } else if (item.type === "QUESTION_CHOSEN") {
            push(
                {
                    title: t("timeline.questionChosen"),
                    detail: item.question_title,
                    ai: false
                },
                time
            )
        } else if (item.type === "ANSWER_SENT") {
            const outOfScope = detail.outcome === "OUT_OF_SCOPE"
            const usedAi = data.llm === "USED"
            const detailKey = outOfScope
                ? "timeline.answer.outOfScope"
                : usedAi
                  ? "timeline.answer.ai"
                  : "timeline.answer.official"

            push({ title: t("timeline.answer.title"), detail: t(detailKey), ai: usedAi }, time)

            if (data.llm === "FAILED") {
                push(
                    {
                        title: t("timeline.aiFailed.title"),
                        detail: t("timeline.aiFailed.detail"),
                        ai: false,
                        tone: NEUTRAL_TONE
                    },
                    time
                )
            }

            if (outOfScope) {
                push(
                    {
                        title: t("timeline.closed.title"),
                        detail: t("timeline.closed.outOfScope"),
                        ai: false,
                        tone: toneOf("OUT_OF_SCOPE")
                    },
                    time
                )
            }
        } else if (item.type === "RESOLVED_ANSWERED") {
            const resolved = data.resolved === true

            push(
                {
                    title: t("timeline.resolved.title"),
                    detail: t("timeline.resolved.answer", {
                        answer: t(resolved ? "timeline.yes" : "timeline.no")
                    }),
                    ai: false
                },
                time
            )

            if (resolved) {
                push(
                    {
                        title: t("timeline.closed.title"),
                        detail: t("timeline.closed.resolved"),
                        ai: false,
                        tone: toneOf("RESOLVED")
                    },
                    time
                )
            }
        } else if (item.type === "SCHEDULE_OFFERED") {
            const inPerson = data.reason === "REQUIRES_IN_PERSON"

            if (inPerson) {
                push(
                    {
                        title: t("timeline.inPerson.title"),
                        detail: t("timeline.inPerson.detail"),
                        ai: false
                    },
                    time
                )
            }

            push(
                {
                    title: t("timeline.offered.title"),
                    detail: t(
                        inPerson ? "timeline.offered.inPerson" : "timeline.offered.notResolved"
                    ),
                    ai: false
                },
                time
            )
        } else if (item.type === "NO_SLOT") {
            push(
                {
                    title: t("timeline.noSlot.title"),
                    detail: t("timeline.noSlot.detail"),
                    ai: false,
                    tone: toneOf("NO_SLOT")
                },
                time
            )
        } else if (item.type === "SCHEDULE_DECLINED") {
            push(
                {
                    title: t("timeline.declined.title"),
                    detail: t("timeline.declined.detail"),
                    ai: false,
                    tone: toneOf("DECLINED")
                },
                time
            )
        } else if (item.type === "ATTENDEE_CHOSEN") {
            push(
                {
                    title: t("timeline.attendee.title"),
                    detail: t(
                        data.by_representative === true
                            ? "timeline.attendee.representative"
                            : "timeline.attendee.holder"
                    ),
                    ai: false
                },
                time
            )
        } else if (item.type === "PHONE_NOTICE_SHOWN") {
            push(
                {
                    title: t("timeline.phoneNotice.title"),
                    detail: t("timeline.phoneNotice.detail"),
                    ai: false
                },
                time
            )
        } else if (item.type === "APPOINTMENT_CREATED") {
            push(
                {
                    title: t("timeline.created.title"),
                    detail: t("timeline.created.detail", { protocol }),
                    ai: false,
                    tone: toneOf("SCHEDULED"),
                    action: openAction(item)
                },
                time
            )
        } else if (item.type === "APPOINTMENT_CONSULTED") {
            push(
                {
                    title: t("timeline.consulted.title", { protocol }),
                    detail: t("timeline.consulted.detail"),
                    ai: false,
                    action: openAction(item)
                },
                time
            )
        } else if (item.type === "APPOINTMENT_RESCHEDULED") {
            const from = dayAndTime(textOf(data, "from"))
            const to = dayAndTime(textOf(data, "to"))

            push(
                {
                    title: t("timeline.rescheduled.title", {
                        fromDate: from.date,
                        fromTime: from.time,
                        toDate: to.date,
                        toTime: to.time
                    }),
                    detail: t("timeline.rescheduled.detail"),
                    ai: false,
                    tone: toneOf("MANAGED_APPOINTMENT")
                },
                time
            )
        } else if (item.type === "APPOINTMENT_CANCELED") {
            push(
                {
                    title: t("timeline.canceled.title"),
                    detail: t("timeline.canceled.detail"),
                    ai: false,
                    tone: toneOf("MANAGED_APPOINTMENT")
                },
                time
            )
        } else if (item.type === "ABANDONED") {
            push(
                {
                    title: t(`timeline.stopped.${textOf(data, "step")}`),
                    detail: t("timeline.abandoned.detail"),
                    ai: false,
                    tone: toneOf("ABANDONED")
                },
                time
            )
        } else {
            push({ title: item.type, detail: null, ai: false }, time)
        }
    }

    if (detail.outcome === "IN_PROGRESS") {
        const lastTime = result.at(-1)?.time ?? formatTimePart(detail.started_at)

        push(
            {
                title: t("timeline.awaiting.title"),
                detail: t("timeline.awaiting.detail", {
                    step: detail.current_step ? t(`steps.${detail.current_step}`) : ""
                }),
                ai: false,
                tone: toneOf("IN_PROGRESS")
            },
            lastTime
        )
    }

    return result
}

export default buildSessionTimeline
