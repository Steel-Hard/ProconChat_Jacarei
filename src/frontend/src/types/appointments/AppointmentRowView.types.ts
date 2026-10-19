import type AppointmentStatus from "@/types/status/AppointmentStatus.types"

type AppointmentRowView = {
    id: string
    protocol: string
    name: string
    cpfMasked: string
    category: string
    question: string
    dayLabel: string
    timeLabel: string
    representative: boolean
    responsibleLabel: string
    unassigned: boolean
    status: AppointmentStatus
    offGrid: boolean
    canClaim: boolean
    claiming: boolean
    detailPath: string
}

export default AppointmentRowView
