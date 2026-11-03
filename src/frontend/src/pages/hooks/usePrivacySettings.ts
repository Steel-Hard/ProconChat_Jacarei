import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useRetentionSettings from "@/pages/hooks/useRetentionSettings"
import privacySettingsApi from "@/store/api/privacySettings.api"
import type PublicPrivacySettings from "@/types/privacy/PublicPrivacySettings.types"
import type PrivacyField from "@/types/privacy/PrivacyField.types"
import type PrivacyFieldKey from "@/types/privacy/PrivacyFieldKey.types"
import type RetentionDaysKey from "@/types/privacy/RetentionDaysKey.types"
import type RetentionPreview from "@/types/privacy/RetentionPreview.types"
import type LastChange from "@/types/settings/LastChange.types"

type Draft = Partial<Record<PrivacyFieldKey, string>>

type SaveError = "privacy.errors.save" | "privacy.errors.preview" | "common:errors.invalidOrigin"

type PendingConfirm = { kind: "enable" | "reduce"; counts: RetentionPreview }

const LIMITS: Record<PrivacyFieldKey, number> = {
    controllerName: 150,
    dpoName: 150,
    contactEmail: 254,
    inPersonContact: 300,
    retentionText: 2000
}
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const FIELD_ORDER: PrivacyFieldKey[] = [
    "controllerName",
    "dpoName",
    "contactEmail",
    "inPersonContact",
    "retentionText"
]

function usePrivacySettings(active: boolean) {
    const { t } = useTranslation(["whatsapp", "common"])
    const [requested, setRequested] = useState(active)
    const [draft, setDraft] = useState<Draft>({})
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<SaveError | null>(null)
    const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
    const saveInFlight = useRef(false)
    const [savePrivacy] = privacySettingsApi.useSavePrivacySettingsMutation()
    const [loadPreview] = privacySettingsApi.useLazyGetRetentionPreviewQuery()

    if (active && !requested) {
        setRequested(true)
    }

    const query = privacySettingsApi.useGetPrivacySettingsQuery(undefined, { skip: !requested })
    const view = query.data
    const retention = useRetentionSettings(view)
    const status = view ? "ready" : query.isError ? "error" : "loading"

    const savedValue = (key: PrivacyFieldKey) => view?.[key] ?? ""
    const valueOf = (key: PrivacyFieldKey) => draft[key] ?? savedValue(key)

    function errorOf(key: PrivacyFieldKey): string | null {
        const value = valueOf(key).trim()

        if (value.length > LIMITS[key]) {
            return t("privacy.tooLong", { max: LIMITS[key] })
        }

        if (key === "contactEmail" && value !== "" && !EMAIL_PATTERN.test(value)) {
            return t("privacy.invalidEmail")
        }

        return null
    }

    const fields: PrivacyField[] = FIELD_ORDER.map((key) => ({
        key,
        label: t(`privacy.fields.${key}`),
        hint: t(`privacy.hints.${key}`),
        hintLabel: t("privacy.hintLabel", { field: t(`privacy.fields.${key}`) }),
        value: valueOf(key),
        error: errorOf(key),
        changed: valueOf(key).trim() !== savedValue(key),
        multiline: key === "retentionText"
    }))

    const changes = [
        ...fields.filter((field) => field.changed).map((field) => field.label),
        ...retention.changes
    ]
    const lastChange: LastChange | null =
        view?.updatedBy && view.updatedAt
            ? { changedBy: view.updatedBy.name, changedAt: view.updatedAt }
            : null

    function discard() {
        setDraft({})
        retention.discard()
        setPendingConfirm(null)
        setSaveError(null)
    }

    const saveDisabled = fields.some((field) => field.error !== null) || retention.hasError

    const clean = (key: PrivacyFieldKey) => valueOf(key).trim() || null

    function payload(): PublicPrivacySettings {
        return {
            controllerName: clean("controllerName"),
            dpoName: clean("dpoName"),
            contactEmail: clean("contactEmail"),
            inPersonContact: clean("inPersonContact"),
            retentionText: clean("retentionText"),
            ...retention.values()
        }
    }

    async function runSave(task: () => Promise<void>, onError: (caught: unknown) => void) {
        saveInFlight.current = true
        setSaving(true)
        setSaveError(null)

        try {
            await task()
        } catch (caught) {
            onError(caught)
        } finally {
            saveInFlight.current = false
            setSaving(false)
        }
    }

    async function persist() {
        await runSave(async () => {
            await savePrivacy(payload()).unwrap()
            setDraft({})
            retention.discard()
        }, handleSaveError)
    }

    async function save() {
        if (changes.length === 0 || saveDisabled || saveInFlight.current) {
            return
        }

        const kind = retention.confirmKind()

        if (kind === null) {
            await persist()
            return
        }

        const { sessionRetentionDays, appointmentRetentionDays } = retention.values()
        await runSave(async () => {
            const counts = await loadPreview({
                sessionDays: sessionRetentionDays,
                appointmentDays: appointmentRetentionDays
            }).unwrap()
            setPendingConfirm({ kind, counts })
        }, handlePreviewError)
    }

    function confirmSave() {
        setPendingConfirm(null)
        void persist()
    }

    function cancelConfirm() {
        setPendingConfirm(null)
    }

    function handlePreviewError(caught: unknown) {
        if ((caught as { status?: unknown }).status !== 401) {
            setSaveError("privacy.errors.preview")
        }
    }

    function handleSaveError(caught: unknown) {
        const httpStatus = (caught as { status?: unknown }).status
        const code = (caught as { data?: { error?: { code?: string } } }).data?.error?.code

        if (httpStatus === 401) {
            return
        }

        setSaveError(
            httpStatus === 403 && code === "INVALID_ORIGIN"
                ? "common:errors.invalidOrigin"
                : "privacy.errors.save"
        )
    }

    function setField(key: PrivacyFieldKey, value: string) {
        setDraft((current) => ({ ...current, [key]: value }))
        setSaveError(null)
    }

    function setRetentionDays(key: RetentionDaysKey, value: string) {
        retention.setDays(key, value)
        setSaveError(null)
    }

    function toggleRetention() {
        retention.toggleEnabled()
        setSaveError(null)
    }

    function confirmDescription(counts: RetentionPreview): string {
        if (counts.sessions === 0 && counts.appointments === 0) {
            return t("privacy.retention.confirm.none")
        }

        return t("privacy.retention.confirm.description", {
            sessions: t("privacy.retention.confirm.sessions", { count: counts.sessions }),
            appointments: t("privacy.retention.confirm.appointments", {
                count: counts.appointments
            })
        })
    }

    const confirm = {
        open: pendingConfirm !== null,
        title:
            pendingConfirm?.kind === "reduce"
                ? t("privacy.retention.confirm.reduceTitle")
                : t("privacy.retention.confirm.enableTitle"),
        description: pendingConfirm === null ? "" : confirmDescription(pendingConfirm.counts),
        confirmLabel: t("privacy.retention.confirm.action"),
        cancelLabel: t("privacy.retention.confirm.cancel")
    }

    return {
        status,
        view,
        fields,
        setField,
        retentionToggle: retention.toggle,
        retentionDays: retention.days,
        toggleRetention,
        setRetentionDays,
        confirm,
        confirmSave,
        cancelConfirm,
        changes,
        lastChange,
        saving,
        saveDisabled,
        discard,
        save,
        saveError: saveError === null ? null : t(saveError)
    }
}

export default usePrivacySettings
