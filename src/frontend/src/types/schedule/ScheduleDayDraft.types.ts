type ScheduleDayDraft = {
    weekday: number
    enabled: boolean
    ranges: { startTime: string; endTime: string }[]
}

export default ScheduleDayDraft
