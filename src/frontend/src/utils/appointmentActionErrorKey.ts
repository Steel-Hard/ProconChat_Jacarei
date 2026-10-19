import type { SerializedError } from "@reduxjs/toolkit"
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react"
import type AppointmentActionCode from "@/types/appointments/AppointmentActionCode.types"

type ActionErrorKey =
    | `appointmentActions.errors.${AppointmentActionCode}`
    | "appointmentActions.errors.forbidden"
    | "appointmentActions.errors.notFound"
    | "appointmentActions.errors.failed"
    | "errors.invalidOrigin"

const ACTION_CODES: readonly string[] = [
    "APPOINTMENT_ALREADY_CLAIMED",
    "ALREADY_ATTENDED",
    "ALREADY_NO_SHOW",
    "APPOINTMENT_CANCELED",
    "ATTENDANCE_NOT_YET_AVAILABLE",
    "NO_SHOW_NOT_YET_AVAILABLE"
] satisfies AppointmentActionCode[]

function errorCodeOf(data: unknown): string | null {
    if (typeof data !== "object" || data === null || !("error" in data)) {
        return null
    }

    const { error } = data

    if (typeof error !== "object" || error === null || !("code" in error)) {
        return null
    }

    return typeof error.code === "string" ? error.code : null
}

function isActionCode(code: string | null): code is AppointmentActionCode {
    return code !== null && ACTION_CODES.includes(code)
}

function appointmentActionErrorKey(
    error: FetchBaseQueryError | SerializedError | undefined
): ActionErrorKey {
    if (error === undefined || !("status" in error)) {
        return "appointmentActions.errors.failed"
    }

    const code = "data" in error ? errorCodeOf(error.data) : null

    if (error.status === 409 && isActionCode(code)) {
        return `appointmentActions.errors.${code}`
    }

    if (error.status === 403) {
        return code === "INVALID_ORIGIN"
            ? "errors.invalidOrigin"
            : "appointmentActions.errors.forbidden"
    }

    if (error.status === 404) {
        return "appointmentActions.errors.notFound"
    }

    return "appointmentActions.errors.failed"
}

export default appointmentActionErrorKey
