import { useRef, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import firstAllowedPath from "@/navigation/firstAllowedPath"
import ROUTES from "@/routers/paths"
import signIn from "@/services/auth/signIn"
import HttpError from "@/services/http/HttpError"
import accountSlice from "@/store/slices/account.slice"
import useAppDispatch from "@/store/useAppDispatch"
import useAppSelector from "@/store/useAppSelector"
import safeRedirectPath from "@/utils/safeRedirectPath"

type LoginError =
    | "login:errors.empty"
    | "login:errors.invalidCredentials"
    | "login:errors.tooManyAttempts"
    | "login:errors.unavailable"
    | "common:errors.invalidOrigin"

function errorFor(error: unknown): LoginError {
    if (!(error instanceof HttpError)) {
        return "login:errors.unavailable"
    }

    if (error.status === 400 || error.status === 401) {
        return "login:errors.invalidCredentials"
    }

    if (error.status === 429) {
        return "login:errors.tooManyAttempts"
    }

    if (error.status === 403 && error.code === "INVALID_ORIGIN") {
        return "common:errors.invalidOrigin"
    }

    return "login:errors.unavailable"
}

function useLogin() {
    const { t } = useTranslation(["login", "common"])
    const dispatch = useAppDispatch()
    const account = useAppSelector((state) => state.account.current)
    const status = useAppSelector((state) => state.account.status)
    const [searchParams] = useSearchParams()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<LoginError | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const inFlight = useRef(false)

    const destination =
        safeRedirectPath(searchParams.get("redirect")) ??
        firstAllowedPath(account) ??
        ROUTES.dashboard

    async function submit(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault()

        if (inFlight.current) {
            return
        }

        if (email.trim() === "" || password === "") {
            setError("login:errors.empty")
            return
        }

        inFlight.current = true
        setSubmitting(true)
        setError(null)

        try {
            const signedIn = await signIn(email, password)
            dispatch(accountSlice.actions.accountLoaded(signedIn))
        } catch (caught) {
            setError(errorFor(caught))
            setPassword("")
            setSubmitting(false)
            inFlight.current = false
        }
    }

    return {
        email,
        setEmail,
        password,
        setPassword,
        error: error === null ? null : t(error),
        submitting,
        submit,
        authenticated: status === "authenticated",
        destination
    }
}

export default useLogin
