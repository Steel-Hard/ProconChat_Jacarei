type AppointmentTimelineStepView = {
    id: string
    title: string
    detail: string | null
    time: string
    ai: boolean
    tone?: { dot: string; ring: string }
    action?: { label: string; onClick: () => void }
}

export default AppointmentTimelineStepView
