import type AppointmentStaff from "@/types/appointments/AppointmentStaff.types"

type AppointmentAssignView = {
    open: boolean
    title: string
    staff: AppointmentStaff[]
    loading: boolean
    failed: boolean
    busy: boolean
    selectedId: string
    onSelect: (id: string) => void
    onRetry: () => void
    onConfirm: () => void
    onClose: () => void
}

export default AppointmentAssignView
