import { createApi } from "@reduxjs/toolkit/query/react"
import baseQueryWithSessionRenewal from "@/store/baseQueryWithSessionRenewal"

const api = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithSessionRenewal,
    tagTypes: [
        "Session",
        "SessionList",
        "Appointment",
        "AppointmentList",
        "AppointmentPendingCount",
        "UserList",
        "SchedulePreview",
        "ScheduleEffective",
        "ScheduleVersions"
    ],
    endpoints: () => ({})
})

export default api
