const dayMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit"
})

function formatDayMonth(value: string): string {
    return dayMonthFormatter.format(new Date(value))
}

export default formatDayMonth
