const CALENDAR_PARAMS = ["visao", "semana"] as const

function withCalendarParams(target: URLSearchParams, source: URLSearchParams): URLSearchParams {
    for (const key of CALENDAR_PARAMS) {
        const value = source.get(key)

        if (value !== null) {
            target.set(key, value)
        }
    }

    return target
}

export default withCalendarParams
