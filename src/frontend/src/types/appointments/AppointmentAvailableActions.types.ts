import type AppointmentAction from "@/types/appointments/AppointmentAction.types"
import type AppointmentActionAvailability from "@/types/appointments/AppointmentActionAvailability.types"

type AppointmentAvailableActions = Record<AppointmentAction, AppointmentActionAvailability>

export default AppointmentAvailableActions
