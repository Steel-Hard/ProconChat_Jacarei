type ScheduleVersionsActions = {
    changeDate: (value: string) => void
    returnCurrent: () => void
    edit: (effectiveFrom: string) => void
    askCancel: (effectiveFrom: string) => void
    confirmCancel: () => void
    dismissCancel: () => void
    confirmSwitch: () => void
    dismissSwitch: () => void
}

export default ScheduleVersionsActions
