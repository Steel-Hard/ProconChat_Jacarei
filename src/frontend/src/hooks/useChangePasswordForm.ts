import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import changePassword from "@/services/auth/changePassword"
import HttpError from "@/services/http/HttpError"

const MIN_LENGTH = 8
const MAX_BYTES = 72

type FormError =
    | "changePassword.errors.tooShort"
    | "changePassword.errors.mismatch"
    | "changePassword.errors.tooLong"
    | "changePassword.errors.wrongCurrent"
    | "changePassword.errors.rejected"
    | "changePassword.errors.unavailable"
    | "errors.invalidOrigin"

function byteLength(value: string): number {
    return new TextEncoder().encode(value).length
}

function localErrorFor(newPassword: string, confirmPassword: string): FormError | null {
    if (newPassword.length > 0 && newPassword.length < MIN_LENGTH) {
        return "changePassword.errors.tooShort"
    }

    if (byteLength(newPassword) > MAX_BYTES) {
        return "changePassword.errors.tooLong"
    }

    if (confirmPassword !== "" && confirmPassword !== newPassword) {
        return "changePassword.errors.mismatch"
    }

    return null
}

function serverErrorFor(error: unknown): FormError | null {
    if (!(error instanceof HttpError)) {
        return "changePassword.errors.unavailable"
    }

    if (error.status === 401) {
        return null
    }

    if (error.status === 400) {
        return error.code === "INVALID_CURRENT_PASSWORD"
            ? "changePassword.errors.wrongCurrent"
            : "changePassword.errors.rejected"
    }

    if (error.status === 403 && error.code === "INVALID_ORIGIN") {
        return "errors.invalidOrigin"
    }

    return "changePassword.errors.unavailable"
}

function useChangePasswordForm(onDone: () => void) {
    const { t } = useTranslation()
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [serverError, setServerError] = useState<FormError | null>(null)
    const [saving, setSaving] = useState(false)
    const inFlight = useRef(false)

    const localError = localErrorFor(newPassword, confirmPassword)
    const canSave =
        currentPassword !== "" &&
        newPassword.length >= MIN_LENGTH &&
        confirmPassword === newPassword &&
        localError === null
    const error = localError ?? serverError

    function reset() {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setServerError(null)
    }

    async function submit() {
        if (!canSave || inFlight.current) {
            return
        }

        inFlight.current = true
        setSaving(true)
        setServerError(null)

        try {
            await changePassword(currentPassword, newPassword)
            reset()
            onDone()
        } catch (caught) {
            setServerError(serverErrorFor(caught))
        } finally {
            inFlight.current = false
            setSaving(false)
        }
    }

    return {
        currentPassword,
        setCurrentPassword,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        error: error === null ? null : t(error),
        canSave,
        saving,
        submit,
        reset
    }
}

export default useChangePasswordForm
