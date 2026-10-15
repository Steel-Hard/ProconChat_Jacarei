import { createApi } from "@reduxjs/toolkit/query/react"
import baseQueryWithSessionRenewal from "@/store/baseQueryWithSessionRenewal"

const api = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithSessionRenewal,
    tagTypes: [],
    endpoints: () => ({})
})

export default api
