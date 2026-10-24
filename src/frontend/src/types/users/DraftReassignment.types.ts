import type CapacityLossReason from "@/types/users/CapacityLossReason.types"
import type Reassignment from "@/types/users/Reassignment.types"

type DraftReassignment = Reassignment & {
    count: number
    reason: CapacityLossReason
}

export default DraftReassignment
