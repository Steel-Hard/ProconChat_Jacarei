type AppointmentTimelineStep = {
    id: string
    type: string
    created_at: string
    generated_by_ai: boolean
    data: Record<string, unknown>
}

export default AppointmentTimelineStep
