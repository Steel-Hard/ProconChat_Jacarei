const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
})

function formatTime(value: Date): string {
    return timeFormatter.format(value)
}

export default formatTime
