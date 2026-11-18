import { createApi } from "@reduxjs/toolkit/query/react"
import baseQueryWithSessionRenewal from "@/store/baseQueryWithSessionRenewal"

const api = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithSessionRenewal,
    tagTypes: [
        "Appointment",
        "AppointmentList",
        "UserList",
        "SchedulePreview",
        "ScheduleEffective",
        "ScheduleVersions",
        "Documents",
        "DocumentsPreview",
        "WhatsAppHistory",
        "WhatsAppMeta"
    ],
    endpoints: () => ({})
})

export default api
