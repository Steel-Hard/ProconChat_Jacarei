import type AppointmentStatus from "@/types/status/AppointmentStatus.types"
import type AppointmentStatusStyle from "@/types/status/AppointmentStatusStyle.types"

const APPOINTMENT_STATUS: Record<AppointmentStatus, AppointmentStatusStyle> = {
    PENDING: { bg: "#FCEFD6", fg: "#7A4F00", border: "#E9C98A" },
    CONFIRMED: { bg: "#E6E2F6", fg: "#3A3072", border: "#BDB3E6" },
    ATTENDED: { bg: "#DFF1E6", fg: "#1B6138", border: "#A9D6BA" },
    NO_SHOW: { bg: "#FBE6DC", fg: "#8A3A12", border: "#EDB9A0" },
    CANCELED: { bg: "#EDECF1", fg: "#55516A", border: "#CFCDD8" }
}

export default APPOINTMENT_STATUS
