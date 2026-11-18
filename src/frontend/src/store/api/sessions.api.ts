import api from "@/store/api"
import type { SessionDetail, SessionFilters, SessionList } from "@/types/sessions/Session.types"

type Envelope<T> = { data: T }

const SESSIONS_PATH = "/api/v1/sessions"

function unwrap<T>(response: Envelope<T>): T {
    return response.data
}

const sessionsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getSessions: build.query<SessionList, SessionFilters>({
            query: (filters) => {
                const params = new URLSearchParams()
                if (filters.search) params.set("search", filters.search)
                params.set("period", filters.period)
                if (filters.categoryId) params.set("category", String(filters.categoryId))
                params.set("outcome", filters.outcome)
                if (filters.period === "custom") {
                    if (filters.from) params.set("from", filters.from)
                    if (filters.to) params.set("to", filters.to)
                }
                params.set("page", String(filters.page))
                params.set("limit", "20")
                return `${SESSIONS_PATH}?${params.toString()}`
            },
            transformResponse: unwrap<SessionList>,
            providesTags: ["SessionList"]
        }),
        getSession: build.query<SessionDetail, string>({
            query: (code) => `${SESSIONS_PATH}/${encodeURIComponent(code)}`,
            transformResponse: unwrap<SessionDetail>,
            providesTags: (_result, _error, code) => [{ type: "Session", id: code }]
        })
    })
})

export default sessionsApi
