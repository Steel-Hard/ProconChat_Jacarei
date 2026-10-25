function shiftMonth(month: string, delta: number): string {
    const [year, monthNumber] = month.split("-").map(Number)
    const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))

    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`
}

export default shiftMonth
