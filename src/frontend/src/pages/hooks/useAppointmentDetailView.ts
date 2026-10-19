import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"
import type AppointmentDocumentGroupView from "@/types/appointments/AppointmentDocumentGroupView.types"
import type AppointmentFactView from "@/types/appointments/AppointmentFactView.types"
import type AppointmentHistoryEntryView from "@/types/appointments/AppointmentHistoryEntryView.types"
import type AppointmentSealView from "@/types/appointments/AppointmentSealView.types"
import type AppointmentTimelineStepView from "@/types/appointments/AppointmentTimelineStepView.types"
import appointmentEventLabel from "@/utils/appointmentEventLabel"
import formatDate from "@/utils/formatDate"
import formatTime from "@/utils/formatTime"
import timelineStepLabel from "@/utils/timelineStepLabel"
import weekdayOf from "@/utils/weekdayOf"

const REASON_KEYS = {
    REQUIRES_IN_PERSON: "facts.reasons.requiresInPerson",
    NOT_RESOLVED: "facts.reasons.notResolved"
} as const

function partsOf(value: string): { date: string; time: string } {
    return { date: formatDate(value) ?? "", time: formatTime(new Date(value)) }
}

function useAppointmentDetailView(detail: AppointmentDetail | undefined) {
    const { t } = useTranslation(["appointmentDetail", "common"])

    return useMemo(() => {
        if (detail === undefined) {
            return null
        }

        const at = (value: string) => t("dateTime", partsOf(value))
        const when = partsOf(detail.appointment_datetime)
        const active = detail.status === "PENDING" || detail.status === "CONFIRMED"
        const seals: AppointmentSealView[] = []

        if (detail.by_representative) {
            seals.push({ label: t("header.seals.representative"), tone: "neutral" })
        }

        if (detail.rescheduled_from !== null) {
            seals.push({ label: t("header.seals.rescheduled"), tone: "neutral" })
        }

        if (detail.off_grid && active) {
            seals.push({ label: t("header.seals.offGrid"), tone: "warning" })
        }

        const facts: AppointmentFactView[] = [
            { label: t("facts.holder"), value: detail.name },
            { label: t("facts.cpf"), value: detail.cpf_masked, mono: true },
            { label: t("facts.datetime"), value: t("facts.datetimeValue", when) },
            { label: t("facts.status"), value: "", status: detail.status },
            {
                label: t("facts.responsible"),
                value: detail.assigned_user_name ?? t("facts.unassigned"),
                emphasis: detail.assigned_user_name === null
            },
            {
                label: t("facts.attendance"),
                value: detail.by_representative
                    ? t("facts.representativeAttends")
                    : t("facts.holderAttends")
            },
            { label: t("facts.reason"), value: t(REASON_KEYS[detail.reason]), wide: true }
        ]

        if (detail.rescheduled_from !== null) {
            facts.push({
                label: t("facts.original"),
                value: at(detail.rescheduled_from),
                wide: true
            })
        }

        facts.push({
            label: t("facts.origin"),
            value: t("facts.originValue", {
                category: detail.category_name,
                question: detail.question_title
            }),
            wide: true
        })

        const groups: AppointmentDocumentGroupView[] = [
            {
                title: detail.by_representative
                    ? t("documents.representativeGroup")
                    : t("documents.holderGroup"),
                items: detail.documents_sent.group,
                emptyText: t("documents.emptyGroup")
            },
            {
                title: t("documents.questionGroup"),
                items: detail.documents_sent.question,
                emptyText: t("documents.emptyQuestion")
            }
        ]

        const steps: AppointmentTimelineStepView[] = detail.timeline.map((step) => {
            const label = timelineStepLabel(step, detail)
            const options = { ns: "appointmentDetail", ...label.values } as const

            return {
                id: step.id,
                title: t(label.titleKey, options),
                detail: label.detailKey === null ? null : t(label.detailKey, options),
                time: formatTime(new Date(step.created_at)),
                ai: step.generated_by_ai
            }
        })

        const history: AppointmentHistoryEntryView[] = detail.events.map((event) => {
            const label = appointmentEventLabel(event)

            return {
                id: event.id,
                text: t(label.key, { ns: "appointmentDetail", ...label.values }),
                when: at(event.created_at),
                highlight: label.highlight
            }
        })

        return {
            title: t("meta.title", { protocol: detail.protocol }),
            header: {
                protocolLabel: t("header.protocol", { protocol: detail.protocol }),
                status: detail.status,
                name: detail.name,
                subtitle: t("header.subtitle", {
                    weekday: t(`common:weekdays.long.${weekdayOf(detail.appointment_datetime)}`),
                    date: when.date,
                    time: when.time,
                    created: at(detail.request_datetime)
                }),
                seals
            },
            facts,
            factsNotice: detail.by_representative ? t("facts.representativeNotice") : null,
            documents: {
                note: t("documents.note", { date: at(detail.request_datetime) }),
                configNotice: detail.is_documents_config_different
                    ? t("documents.configNotice")
                    : null,
                groups
            },
            steps,
            history
        }
    }, [detail, t])
}

export default useAppointmentDetailView
