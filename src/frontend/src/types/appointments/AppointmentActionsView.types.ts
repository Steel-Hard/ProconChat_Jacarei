import type AppointmentActionItemView from "@/types/appointments/AppointmentActionItemView.types"

type AppointmentActionsView = {
    items: AppointmentActionItemView[]
    finalText: string | null
    readOnlyText: string | null
    error: string | null
}

export default AppointmentActionsView
