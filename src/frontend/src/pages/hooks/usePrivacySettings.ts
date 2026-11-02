import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import privacySettingsApi from "@/store/api/privacySettings.api"
import type PublicPrivacySettings from "@/types/privacy/PublicPrivacySettings.types"
import type PrivacyField from "@/types/privacy/PrivacyField.types"
import type PrivacyFieldKey from "@/types/privacy/PrivacyFieldKey.types"
import type LastChange from "@/types/settings/LastChange.types"

type Draft = Partial<Record<PrivacyFieldKey, string>>

type SaveError = "privacy.errors.save" | "common:errors.invalidOrigin"

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
    const saveInFlight = useRef(false)
    const [savePrivacy] = privacySettingsApi.useSavePrivacySettingsMutation()

    if (active && !requested) {
        setRequested(true)
    }

    const query = privacySettingsApi.useGetPrivacySettingsQuery(undefined, { skip: !requested })
    const view = query.data
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

    const changes = fields.filter((field) => field.changed).map((field) => field.label)
    const lastChange: LastChange | null =
        view?.updatedBy && view.updatedAt
            ? { changedBy: view.updatedBy.name, changedAt: view.updatedAt }
            : null

    function discard() {
        setDraft({})
        setSaveError(null)
    }

    const saveDisabled = fields.some((field) => field.error !== null)

    const clean = (key: PrivacyFieldKey) => valueOf(key).trim() || null

    function payload(): PublicPrivacySettings {
        return {
            controllerName: clean("controllerName"),
            dpoName: clean("dpoName"),
            contactEmail: clean("contactEmail"),
            inPersonContact: clean("inPersonContact"),
            retentionText: clean("retentionText")
        }
    }

    async function save() {
        if (changes.length === 0 || saveDisabled || saveInFlight.current) {
            return
        }

        saveInFlight.current = true
        setSaving(true)
        setSaveError(null)

        try {
            await savePrivacy(payload()).unwrap()
            setDraft({})
        } catch (caught) {
            handleSaveError(caught)
        } finally {
            saveInFlight.current = false
            setSaving(false)
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

    return {
        status,
        view,
        fields,
        setField,
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
