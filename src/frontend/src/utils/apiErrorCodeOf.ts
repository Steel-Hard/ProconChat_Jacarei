function apiErrorCodeOf(error: unknown): string | null {
    if (typeof error !== "object" || error === null || !("data" in error)) {
        return null
    }

    const { data } = error

    if (typeof data !== "object" || data === null || !("error" in data)) {
        return null
    }

    const payload = data.error

    if (typeof payload !== "object" || payload === null || !("code" in payload)) {
        return null
    }

    return typeof payload.code === "string" ? payload.code : null
}

export default apiErrorCodeOf
