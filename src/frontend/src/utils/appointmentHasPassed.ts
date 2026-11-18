function appointmentHasPassed(appointmentDatetime: string, nowMs: number): boolean {
    const start = Date.parse(appointmentDatetime)

    return !Number.isNaN(start) && start <= nowMs
}

export default appointmentHasPassed
