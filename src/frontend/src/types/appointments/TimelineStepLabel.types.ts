import type resources from "@/i18n/resources"

type TimelineTexts = (typeof resources)["pt-BR"]["appointmentDetail"]["timeline"]

type TimelineStepLabel = {
    titleKey: `timeline.titles.${keyof TimelineTexts["titles"]}`
    detailKey: `timeline.details.${keyof TimelineTexts["details"]}` | null
    values: Record<string, string>
}

export default TimelineStepLabel
