import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import HttpError from "@/services/http/HttpError"
import saveWhatsAppSettings from "@/services/whatsapp/saveWhatsAppSettings"
import testWhatsAppConnection from "@/services/whatsapp/testWhatsAppConnection"
import whatsappSettingsApi from "@/store/api/whatsappSettings.api"
import useAppDispatch from "@/store/useAppDispatch"
import type LastChange from "@/types/settings/LastChange.types"
import type WhatsAppStatus from "@/types/status/WhatsAppStatus.types"
import type WhatsAppAccessTokenLifetime from "@/types/whatsapp/WhatsAppAccessTokenLifetime.types"
import type WhatsAppConnectionReason from "@/types/whatsapp/WhatsAppConnectionReason.types"
import type WhatsAppHint from "@/types/whatsapp/WhatsAppHint.types"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"
import type WhatsAppSettingsInput from "@/types/whatsapp/WhatsAppSettingsInput.types"
import type WhatsAppTestMessage from "@/types/whatsapp/WhatsAppTestMessage.types"
import formatDate from "@/utils/formatDate"
import formatTime from "@/utils/formatTime"

type SecretKey = "accessToken" | "appSecret"
type IdKey = "phoneNumberId" | "businessAccountId"
type FieldKey = IdKey | SecretKey

type Draft = {
    phoneNumberId?: string
    businessAccountId?: string
    accessToken: string | null
    appSecret: string | null
}

type TestOutcome =
    | {
          kind: "ok"
          displayPhoneNumber: string
          verifiedName: string
          accessTokenLifetime: WhatsAppAccessTokenLifetime
      }
    | { kind: "failed"; message: string }
    | { kind: "error"; message: string }

type StoredOutcome = { signature: string; outcome: TestOutcome }

type SecretState = { configured: boolean; last4: string | null; value: string | null }

type ActionError = "errors.save" | "errors.pause" | "errors.resume" | "common:errors.invalidOrigin"

const EMPTY_DRAFT: Draft = { accessToken: null, appSecret: null }
const FIELD_ORDER: FieldKey[] = ["phoneNumberId", "businessAccountId", "accessToken", "appSecret"]
const ID_PATTERN = /^\d{1,40}$/
const DAY_MS = 24 * 60 * 60 * 1000
const WARNING_DAYS = 7
const DANGER_DAYS = 3
const UNKNOWN_LIFETIME: WhatsAppAccessTokenLifetime = { kind: "UNKNOWN", expiresAt: null }
const REASONS: WhatsAppConnectionReason[] = [
    "INVALID_TOKEN",
    "INVALID_APP_SECRET",
    "PHONE_NUMBER_NOT_FOUND",
    "BUSINESS_ACCOUNT_NOT_FOUND",
    "PHONE_NOT_IN_ACCOUNT",
    "MISSING_PERMISSION",
    "META_UNAVAILABLE",
    "META_ERROR"
]

function isSecret(key: FieldKey): key is SecretKey {
    return key === "accessToken" || key === "appSecret"
}

function reasonOf(code: string | undefined): WhatsAppConnectionReason {
    return REASONS.find((reason) => reason === code) ?? "META_ERROR"
}

function isUnauthorized(error: unknown): boolean {
    return error instanceof HttpError && error.status === 401
}

function isInvalidOrigin(error: unknown): boolean {
    return error instanceof HttpError && error.status === 403 && error.code === "INVALID_ORIGIN"
}

function situationOf(view: WhatsAppSettings): WhatsAppStatus {
    if (view.autoReplyPaused) {
        return "PAUSED"
    }

    if (view.phoneNumberId === null) {
        return "NOT_CONFIGURED"
    }

    if (view.credentialsValid === false) {
        return "INVALID_CREDENTIALS"
    }

    if (view.credentialsValid === null) {
        return "NOT_VERIFIED"
    }

    return "OPERATING"
}

function useWhatsAppSettings() {
    const { t } = useTranslation(["whatsapp", "common"])
    const { showToast } = useToast()
    const dispatch = useAppDispatch()
    const query = whatsappSettingsApi.useGetWhatsAppSettingsQuery()
    const [pauseReplies] = whatsappSettingsApi.usePauseWhatsAppRepliesMutation()
    const [resumeReplies] = whatsappSettingsApi.useResumeWhatsAppRepliesMutation()
    const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
    const [secretRevisions, setSecretRevisions] = useState({ accessToken: 0, appSecret: 0 })
    const [stored, setStored] = useState<StoredOutcome | null>(null)
    const [testing, setTesting] = useState(false)
    const [saving, setSaving] = useState(false)
    const [switching, setSwitching] = useState(false)
    const [pauseDialogOpen, setPauseDialogOpen] = useState(false)
    const [actionError, setActionError] = useState<ActionError | null>(null)
    const [renderedAt, setRenderedAt] = useState(() => Date.now())
    const [messageTime] = useState(() => formatTime(new Date()))
    const testInFlight = useRef(false)
    const saveInFlight = useRef(false)
    const switchInFlight = useRef(false)

    const view = query.data
    const status = view ? "ready" : query.isError ? "error" : "loading"

    const fieldLabel = (key: FieldKey) => t(`credentials.fields.${key}`)
    const savedId = (key: IdKey) => view?.[key] ?? ""
    const idValue = (key: IdKey) => draft[key] ?? savedId(key)
    const phoneNumberId = idValue("phoneNumberId")
    const businessAccountId = idValue("businessAccountId")

    function secretState(key: SecretKey): SecretState {
        const saved = view?.[key] ?? { configured: false, last4: null }

        return { configured: saved.configured, last4: saved.last4, value: draft[key] }
    }

    const secrets = { accessToken: secretState("accessToken"), appSecret: secretState("appSecret") }

    function isChanged(key: FieldKey): boolean {
        if (isSecret(key)) {
            return Boolean(draft[key])
        }

        return idValue(key).trim() !== savedId(key)
    }

    const changedKeys = FIELD_ORDER.filter(isChanged)
    const changes = changedKeys.map(fieldLabel)

    const input: WhatsAppSettingsInput = {
        phoneNumberId: phoneNumberId.trim(),
        businessAccountId: businessAccountId.trim(),
        accessToken: draft.accessToken,
        appSecret: draft.appSecret
    }
    const signature = JSON.stringify({
        phoneNumberId: input.phoneNumberId,
        businessAccountId: input.businessAccountId,
        accessToken: draft.accessToken === null ? null : secretRevisions.accessToken,
        appSecret: draft.appSecret === null ? null : secretRevisions.appSecret
    })
    const testResult = stored !== null && stored.signature === signature ? stored.outcome : null
    const testOk = testResult?.kind === "ok"
    const testedLifetime = testResult?.kind === "ok" ? testResult.accessTokenLifetime : null
    const replacingToken = draft.accessToken !== null || !secrets.accessToken.configured
    const needTest = changes.length > 0 && !testOk

    function updateDraft(next: Partial<Draft>) {
        setDraft((current) => ({ ...current, ...next }))
        setActionError(null)
    }

    function updateSecret(key: SecretKey, value: string | null) {
        setSecretRevisions((current) => ({ ...current, [key]: current[key] + 1 }))
        updateDraft({ [key]: value })
    }

    function localProblem(): string | null {
        for (const key of FIELD_ORDER) {
            const problem = fieldProblem(key)

            if (problem !== null) {
                return problem
            }
        }

        return null
    }

    function fieldProblem(key: FieldKey): string | null {
        const field = fieldLabel(key)

        if (isSecret(key)) {
            const value = draft[key]
            const missing = value === "" || (value === null && !secrets[key].configured)

            if (missing) {
                return t("test.missingField", { field })
            }

            return value !== null && /\s/.test(value) ? t("test.secretWithSpaces", { field }) : null
        }

        const value = input[key]

        if (value === "") {
            return t("test.missingField", { field })
        }

        return ID_PATTERN.test(value) ? null : t("test.invalidId", { field })
    }

    function refreshClock() {
        setRenderedAt(Date.now())
    }

    function remember(outcome: TestOutcome, forSignature = signature) {
        setStored({ signature: forSignature, outcome })
    }

    function failureFromReason(reason: WhatsAppConnectionReason): TestOutcome {
        return { kind: "failed", message: t(`reasons.${reason}`) }
    }

    async function runTest() {
        if (testInFlight.current || saveInFlight.current || !view) {
            return
        }

        const problem = localProblem()

        if (problem !== null) {
            remember({ kind: "failed", message: problem })
            return
        }

        const sentSignature = signature
        testInFlight.current = true
        setTesting(true)
        setActionError(null)
        setStored(null)

        try {
            const result = await testWhatsAppConnection(input)
            remember(
                result.ok
                    ? {
                          kind: "ok",
                          displayPhoneNumber: result.displayPhoneNumber,
                          verifiedName: result.verifiedName,
                          accessTokenLifetime: result.accessTokenLifetime
                      }
                    : failureFromReason(result.reason),
                sentSignature
            )
        } catch (caught) {
            if (!isUnauthorized(caught)) {
                remember(
                    {
                        kind: "error",
                        message: isInvalidOrigin(caught)
                            ? t("common:errors.invalidOrigin")
                            : t("errors.test")
                    },
                    sentSignature
                )
            }
        } finally {
            testInFlight.current = false
            setTesting(false)
            refreshClock()
        }
    }

    function discard() {
        setDraft(EMPTY_DRAFT)
        setStored(null)
        setActionError(null)
    }

    async function save() {
        if (changes.length === 0 || !testOk || saveInFlight.current || testInFlight.current) {
            return
        }

        saveInFlight.current = true
        setSaving(true)
        setActionError(null)

        try {
            const saved = await saveWhatsAppSettings(input)
            dispatch(
                whatsappSettingsApi.util.upsertQueryEntries([
                    { endpointName: "getWhatsAppSettings", arg: undefined, value: saved }
                ])
            )
            setDraft(EMPTY_DRAFT)
            setStored(null)
            refreshClock()
            showToast(t("toasts.saved"))
        } catch (caught) {
            handleSaveError(caught)
        } finally {
            saveInFlight.current = false
            setSaving(false)
        }
    }

    function handleSaveError(caught: unknown) {
        if (caught instanceof HttpError && caught.status === 422) {
            remember(failureFromReason(reasonOf(caught.code)))
            return
        }

        if (!isUnauthorized(caught)) {
            setActionError(isInvalidOrigin(caught) ? "common:errors.invalidOrigin" : "errors.save")
        }
    }

    async function switchReplies(paused: boolean) {
        if (switchInFlight.current) {
            return
        }

        switchInFlight.current = true
        setSwitching(true)
        setActionError(null)

        try {
            await (paused ? pauseReplies() : resumeReplies()).unwrap()
            showToast(t(paused ? "toasts.paused" : "toasts.resumed"))
        } catch (caught) {
            const httpStatus = (caught as { status?: unknown }).status
            const code = (caught as { data?: { error?: { code?: string } } }).data?.error?.code

            if (httpStatus !== 401) {
                setActionError(
                    httpStatus === 403 && code === "INVALID_ORIGIN"
                        ? "common:errors.invalidOrigin"
                        : paused
                          ? "errors.pause"
                          : "errors.resume"
                )
            }
        } finally {
            switchInFlight.current = false
            setSwitching(false)
            setPauseDialogOpen(false)
        }
    }

    async function togglePause() {
        if (!view || switchInFlight.current) {
            return
        }

        if (view.autoReplyPaused) {
            await switchReplies(false)
            return
        }

        setPauseDialogOpen(true)
    }

    async function confirmPause() {
        await switchReplies(true)
    }

    function closePauseDialog() {
        if (!switchInFlight.current) {
            setPauseDialogOpen(false)
        }
    }

    async function copy(value: string) {
        try {
            await navigator.clipboard.writeText(value)
            showToast(t("metaSetup.copied"))
        } catch {
            showToast(t("metaSetup.copyFailed"))
        }
    }

    function messageOf(outcome: TestOutcome | null): WhatsAppTestMessage | null {
        if (outcome === null) {
            return null
        }

        if (outcome.kind === "ok") {
            return {
                tone: "success",
                title: t("test.successTitle"),
                detail: t("test.successDetail", {
                    number: outcome.displayPhoneNumber,
                    name: outcome.verifiedName
                })
            }
        }

        if (outcome.kind === "failed") {
            return { tone: "error", title: t("test.failureTitle"), detail: outcome.message }
        }

        return { tone: "error", title: outcome.message, detail: "" }
    }

    function effectiveLifetime(): WhatsAppAccessTokenLifetime {
        if (replacingToken) {
            return testedLifetime ?? UNKNOWN_LIFETIME
        }

        if (testedLifetime !== null && testedLifetime.kind !== "UNKNOWN") {
            return testedLifetime
        }

        return view?.accessTokenLifetime ?? UNKNOWN_LIFETIME
    }

    function expiringHint(expiresAt: string): WhatsAppHint {
        const expires = new Date(expiresAt)
        const date = formatDate(expiresAt)

        if (date === null) {
            return { text: t("credentials.tokenHint"), tone: "warning" }
        }

        const values = { date, time: formatTime(expires) }
        const remaining = expires.getTime() - renderedAt

        if (remaining <= 0) {
            return { text: t("credentials.tokenExpired", values), tone: "danger" }
        }

        if (remaining <= DANGER_DAYS * DAY_MS) {
            return { text: t("credentials.tokenExpires", values), tone: "danger" }
        }

        if (remaining <= WARNING_DAYS * DAY_MS) {
            return { text: t("credentials.tokenExpires", values), tone: "warning" }
        }

        return { text: t("credentials.tokenExpiresInfo", values), tone: "neutral" }
    }

    function tokenHintOf(lifetime: WhatsAppAccessTokenLifetime): WhatsAppHint | null {
        if (lifetime.kind === "PERMANENT") {
            return null
        }

        if (lifetime.kind === "EXPIRING") {
            return expiringHint(lifetime.expiresAt)
        }

        return { text: t("credentials.tokenHint"), tone: "warning" }
    }

    const lastChange: LastChange | null =
        view?.updatedBy != null
            ? { changedBy: view.updatedBy.name, changedAt: view.updatedAt }
            : null

    return {
        status,
        view,
        situation: view ? situationOf(view) : null,
        messageTime,
        lastChange,
        phoneNumberId,
        businessAccountId,
        setPhoneNumberId: (value: string) => updateDraft({ phoneNumberId: value }),
        setBusinessAccountId: (value: string) => updateDraft({ businessAccountId: value }),
        secrets,
        replaceSecret: (key: SecretKey) => updateSecret(key, ""),
        cancelSecret: (key: SecretKey) => updateSecret(key, null),
        setSecret: (key: SecretKey, value: string) => updateSecret(key, value),
        changedKeys,
        changes,
        testResult,
        testMessage: messageOf(testResult),
        tokenHint: tokenHintOf(effectiveLifetime()),
        testing,
        needTest,
        saveDisabled: needTest || testing,
        saving,
        switching,
        runTest,
        discard,
        save,
        pauseDialogOpen,
        togglePause,
        confirmPause,
        closePauseDialog,
        copy,
        actionError: actionError === null ? null : t(actionError)
    }
}

export default useWhatsAppSettings
