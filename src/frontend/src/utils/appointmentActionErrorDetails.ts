import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react"
import type { SerializedError } from "@reduxjs/toolkit"

function appointmentActionErrorDetails(error: FetchBaseQueryError | SerializedError | undefined): {
    code: string | null
    conflictingProtocol: string | null
} {
    if (!error || !("data" in error)) {
        return { code: null, conflictingProtocol: null }
    }

    const data = error.data
    if (typeof data !== "object" || data === null || !("error" in data)) {
        return { code: null, conflictingProtocol: null }
    }

    const payload = data.error
    if (typeof payload !== "object" || payload === null || !("code" in payload)) {
        return { code: null, conflictingProtocol: null }
    }

    const code = typeof payload.code === "string" ? payload.code : null
    const details =
        "details" in payload && typeof payload.details === "object" && payload.details !== null
            ? payload.details
            : null
    const conflictingProtocol =
        details &&
        "conflictingProtocol" in details &&
        typeof details.conflictingProtocol === "string"
            ? details.conflictingProtocol
            : null

    return { code, conflictingProtocol }
}

export default appointmentActionErrorDetails
