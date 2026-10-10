import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import getLanguage from "@/i18n/getLanguage"
import API_URL from "@/services/http/apiUrl"
import getToken from "@/services/session/getToken"

const api = createApi({
    reducerPath: "api",
    baseQuery: fetchBaseQuery({
        baseUrl: API_URL,
        credentials: "include",
        prepareHeaders: (headers) => {
            headers.set("Accept-Language", getLanguage())
            const token = getToken()

            if (token) {
                headers.set("Authorization", `Bearer ${token}`)
            }

            return headers
        }
    }),
    tagTypes: [],
    endpoints: () => ({})
})

export default api
