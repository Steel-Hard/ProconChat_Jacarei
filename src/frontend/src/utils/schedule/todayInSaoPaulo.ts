const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
})

function todayInSaoPaulo(now: Date = new Date()): string {
    return dateFormatter.format(now)
}

export default todayInSaoPaulo
