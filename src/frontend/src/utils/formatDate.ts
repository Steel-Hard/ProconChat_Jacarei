const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
})

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function formatDateOnly(year: string, month: string, day: string): string | null {
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))

    if (date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
        return null
    }

    return `${day}/${month}/${year}`
}

export function formatDate(value: string): string | null {
    const dateOnly = DATE_ONLY.exec(value)

    if (dateOnly) {
        return formatDateOnly(dateOnly[1], dateOnly[2], dateOnly[3])
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return dateFormatter.format(date)
}
