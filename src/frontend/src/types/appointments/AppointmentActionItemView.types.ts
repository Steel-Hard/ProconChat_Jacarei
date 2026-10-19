import type AppointmentAction from "@/types/appointments/AppointmentAction.types"

type AppointmentActionItemView =
    | { kind: "button"; action: AppointmentAction; label: string }
    | { kind: "waiting"; action: AppointmentAction; text: string }

export default AppointmentActionItemView
