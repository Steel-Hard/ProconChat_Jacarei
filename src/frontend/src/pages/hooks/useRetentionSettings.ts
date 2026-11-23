import { useState } from "react"
import { useTranslation } from "react-i18next"
import type PrivacySettings from "@/types/privacy/PrivacySettings.types"
import type RetentionDaysField from "@/types/privacy/RetentionDaysField.types"
import type RetentionDaysKey from "@/types/privacy/RetentionDaysKey.types"
import type RetentionToggle from "@/types/privacy/RetentionToggle.types"

type RetentionDraft = {
    enabled?: boolean
    sessionRetentionDays?: string
    appointmentRetentionDays?: string
}

type RetentionValues = {
    retentionEnabled: boolean
    sessionRetentionDays: number
    appointmentRetentionDays: number
}

type ConfirmKind = "enable" | "reduce"

const MAX_DAYS = 1825
const MIN_DAYS: Record<RetentionDaysKey, number> = {
    sessionRetentionDays: 30,
    appointmentRetentionDays: 90
}
const DAYS_ORDER: RetentionDaysKey[] = ["sessionRetentionDays", "appointmentRetentionDays"]
const INTEGER_PATTERN = /^\d+$/

function useRetentionSettings(view: PrivacySettings | undefined) {
    const { t } = useTranslation("whatsapp")
    const [draft, setDraft] = useState<RetentionDraft>({})

    const savedEnabled = view?.retentionEnabled ?? false
    const enabled = draft.enabled ?? savedEnabled
    const savedDays = (key: RetentionDaysKey) => view?.[key] ?? MIN_DAYS[key]
    const daysText = (key: RetentionDaysKey) => draft[key] ?? String(savedDays(key))
    const daysValue = (key: RetentionDaysKey) => Number(daysText(key).trim())

    function daysError(key: RetentionDaysKey): string | null {
        const text = daysText(key).trim()
        const value = Number(text)
        const valid = INTEGER_PATTERN.test(text) && value >= MIN_DAYS[key] && value <= MAX_DAYS

        return valid
            ? null
            : t("privacy.retention.daysError", { min: MIN_DAYS[key], max: MAX_DAYS })
    }

    const toggle: RetentionToggle = {
        label: t("privacy.retention.enabled"),
        hint: t("privacy.retention.enabledHint"),
        hintLabel: t("privacy.hintLabel", { field: t("privacy.retention.enabled") }),
        stateLabel: enabled ? t("privacy.retention.stateOn") : t("privacy.retention.stateOff"),
        checked: enabled,
        changed: enabled !== savedEnabled
    }

    const days: RetentionDaysField[] = DAYS_ORDER.map((key) => ({
        key,
        label: t(`privacy.retention.fields.${key}`),
        hint: t(`privacy.retention.hints.${key}`),
        hintLabel: t("privacy.hintLabel", { field: t(`privacy.retention.fields.${key}`) }),
        value: daysText(key),
        min: MIN_DAYS[key],
        max: MAX_DAYS,
        error: daysError(key),
        changed: daysText(key).trim() !== String(savedDays(key))
    }))

    const changes = [
        ...(toggle.changed ? [toggle.label] : []),
        ...days.filter((field) => field.changed).map((field) => field.label)
    ]

    const hasError = days.some((field) => field.error !== null)

    function values(): RetentionValues {
        return {
            retentionEnabled: enabled,
            sessionRetentionDays: daysValue("sessionRetentionDays"),
            appointmentRetentionDays: daysValue("appointmentRetentionDays")
        }
    }

    function confirmKind(): ConfirmKind | null {
        if (!enabled) {
            return null
        }

        if (!savedEnabled) {
            return "enable"
        }

        const reduced = DAYS_ORDER.some((key) => daysValue(key) < savedDays(key))

        return reduced ? "reduce" : null
    }

    function toggleEnabled() {
        setDraft((current) => ({ ...current, enabled: !(current.enabled ?? savedEnabled) }))
    }

    function setDays(key: RetentionDaysKey, value: string) {
        setDraft((current) => ({ ...current, [key]: value }))
    }

    function discard() {
        setDraft({})
    }

    return { toggle, days, changes, hasError, values, confirmKind, toggleEnabled, setDays, discard }
}

export default useRetentionSettings
