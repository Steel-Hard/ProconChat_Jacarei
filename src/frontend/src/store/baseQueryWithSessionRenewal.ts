import { fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react"
import getLanguage from "@/i18n/getLanguage"
import API_URL from "@/services/http/apiUrl"
import authHandlers from "@/services/http/authHandlers"
import refreshSession from "@/services/http/refreshSession"

const rawBaseQuery = fetchBaseQuery({
    baseUrl: API_URL,
    credentials: "include",
    prepareHeaders: (headers) => {
        headers.set("Accept-Language", getLanguage())

        return headers
    }
})

const baseQueryWithSessionRenewal: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions)

    if (result.error?.status !== 401) {
        return result
    }

    if (await refreshSession()) {
        const retried = await rawBaseQuery(args, api, extraOptions)

        if (retried.error?.status !== 401) {
            return retried
        }
    }

    authHandlers.unauthorizedHandler?.()
    return result
}

export default baseQueryWithSessionRenewal
