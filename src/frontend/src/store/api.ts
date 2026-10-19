import { createApi } from "@reduxjs/toolkit/query/react"
import baseQueryWithSessionRenewal from "@/store/baseQueryWithSessionRenewal"

const api = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithSessionRenewal,
    tagTypes: ["Appointment", "AppointmentList", "AppointmentPendingCount"],
    endpoints: () => ({})
})

export default api
