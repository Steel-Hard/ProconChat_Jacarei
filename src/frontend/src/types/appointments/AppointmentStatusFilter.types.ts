import type AppointmentStatus from "@/types/status/AppointmentStatus.types"

type AppointmentStatusFilter = "all" | AppointmentStatus | "waiting_record"

export default AppointmentStatusFilter
