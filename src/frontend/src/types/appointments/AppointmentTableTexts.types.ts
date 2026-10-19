import type AppointmentRowTexts from "@/types/appointments/AppointmentRowTexts.types"

type AppointmentTableTexts = {
    label: string
    columns: {
        protocol: string
        holder: string
        category: string
        datetime: string
        representative: string
        responsible: string
        status: string
        compactDatetime: string
        actions: string
    }
    arrows: {
        asc: string
        desc: string
    }
    row: AppointmentRowTexts
}

export default AppointmentTableTexts
