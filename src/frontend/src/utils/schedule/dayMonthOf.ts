function dayMonthOf(date: string): string {
    return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}

export default dayMonthOf
