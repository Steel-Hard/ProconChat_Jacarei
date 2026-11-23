import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type ResetPasswordForm from "@/types/users/ResetPasswordForm.types"
import type UserApiError from "@/types/users/UserApiError.types"
import passwordProblem from "@/utils/users/passwordProblem"
import userApiErrorOf from "@/utils/userApiErrorOf"

const MIN_LENGTH = 8

function useResetPasswordForm(
    resetPassword: (password: string) => Promise<void>
): ResetPasswordForm {
    const { t } = useTranslation(["users", "common"])
    const [password, setPasswordValue] = useState("")
    const [confirmPassword, setConfirmValue] = useState("")
    const [serverError, setServerError] = useState<UserApiError | null>(null)
    const [saving, setSaving] = useState(false)
    const inFlight = useRef(false)

    const problem = passwordProblem(password)
    const mismatch = confirmPassword !== "" && confirmPassword !== password
    const canSubmit =
        password.length >= MIN_LENGTH && confirmPassword === password && problem === null

    function localError(): string | null {
        if (problem !== null) {
            return t(`dialogs.reset.errors.${problem}`)
        }

        return mismatch ? t("dialogs.reset.errors.mismatch") : null
    }

    function edit(setter: (value: string) => void) {
        return (value: string) => {
            setter(value)
            setServerError(null)
        }
    }

    function reset() {
        setPasswordValue("")
        setConfirmValue("")
        setServerError(null)
    }

    async function submit() {
        if (!canSubmit || inFlight.current) {
            return
        }

        inFlight.current = true
        setSaving(true)
        setServerError(null)

        try {
            await resetPassword(password)
            reset()
        } catch (caught) {
            setServerError(userApiErrorOf(caught, "reset"))
        } finally {
            inFlight.current = false
            setSaving(false)
        }
    }

    return {
        password,
        setPassword: edit(setPasswordValue),
        confirmPassword,
        setConfirmPassword: edit(setConfirmValue),
        error: localError() ?? (serverError === null ? null : t(serverError.key, { name: "" })),
        canSubmit,
        saving,
        submit,
        reset
    }
}

export default useResetPasswordForm
