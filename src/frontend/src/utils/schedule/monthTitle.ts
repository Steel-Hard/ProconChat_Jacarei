const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric"
})

function monthTitle(month: string): string {
    const [year, monthNumber] = month.split("-").map(Number)
    const text = monthFormatter.format(new Date(Date.UTC(year, monthNumber - 1, 15)))

    return text.charAt(0).toUpperCase() + text.slice(1)
}

export default monthTitle
