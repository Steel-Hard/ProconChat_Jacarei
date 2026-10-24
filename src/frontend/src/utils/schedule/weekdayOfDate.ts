function weekdayOfDate(date: string): number {
    const [year, month, day] = date.split("-").map(Number)

    return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
}

export default weekdayOfDate
