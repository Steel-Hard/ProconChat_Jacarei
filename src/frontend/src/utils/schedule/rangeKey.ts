function rangeKey(weekday: number, rangeIndex: number): string {
    return `${weekday}.${rangeIndex}`
}

export default rangeKey
