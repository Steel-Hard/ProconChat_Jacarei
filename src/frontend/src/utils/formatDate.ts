const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
})

export function formatDate(value: string): string | null {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return dateFormatter.format(date)
}
