import type CapacityLossReason from "@/types/users/CapacityLossReason.types"
import type FutureAppointment from "@/types/users/FutureAppointment.types"
import type UserDraftEntry from "@/types/users/UserDraftEntry.types"

type ReassignmentRequest = {
    userId: number
    change: UserDraftEntry
    reason: CapacityLossReason
    appointments: FutureAppointment[]
    revision: number
}

export default ReassignmentRequest
