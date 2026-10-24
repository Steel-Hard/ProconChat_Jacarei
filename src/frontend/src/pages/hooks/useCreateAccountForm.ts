import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type CreateAccountForm from "@/types/users/CreateAccountForm.types"
import type CreateAccountInput from "@/types/users/CreateAccountInput.types"
import type UserApiError from "@/types/users/UserApiError.types"
import passwordProblem from "@/utils/users/passwordProblem"
import userApiErrorOf from "@/utils/userApiErrorOf"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_LENGTH = 8

function normalizedEmail(value: string): string {
    return value.trim().toLowerCase()
}

function useCreateAccountForm(
    existingEmails: string[],
    create: (input: CreateAccountInput) => Promise<void>
): CreateAccountForm {
    const { t } = useTranslation(["users", "common"])
    const [name, setNameValue] = useState("")
    const [email, setEmailValue] = useState("")
    const [password, setPasswordValue] = useState("")
    const [serverError, setServerError] = useState<UserApiError | null>(null)
    const [saving, setSaving] = useState(false)
    const inFlight = useRef(false)

    const trimmedEmail = email.trim()
    const emailInUse =
        trimmedEmail !== "" &&
        existingEmails.some((existing) => normalizedEmail(existing) === normalizedEmail(email))
    const problem = passwordProblem(password)
    const canSubmit =
        name.trim() !== "" &&
        EMAIL_PATTERN.test(trimmedEmail) &&
        !emailInUse &&
        password.length >= MIN_LENGTH &&
        problem === null

    function edit(setter: (value: string) => void) {
        return (value: string) => {
            setter(value)
            setServerError(null)
        }
    }

    function reset() {
        setNameValue("")
        setEmailValue("")
        setPasswordValue("")
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
            await create({ name: name.trim(), email: trimmedEmail, password })
            reset()
        } catch (caught) {
            setServerError(userApiErrorOf(caught, "create"))
        } finally {
            inFlight.current = false
            setSaving(false)
        }
    }

    return {
        name,
        setName: edit(setNameValue),
        email,
        setEmail: edit(setEmailValue),
        password,
        setPassword: edit(setPasswordValue),
        emailError: emailInUse ? t("dialogs.create.errors.emailInUse") : null,
        passwordError: problem === null ? null : t(`dialogs.create.errors.${problem}`),
        error: serverError === null ? null : t(serverError.key, { name: "" }),
        canSubmit,
        saving,
        submit,
        reset
    }
}

export default useCreateAccountForm
