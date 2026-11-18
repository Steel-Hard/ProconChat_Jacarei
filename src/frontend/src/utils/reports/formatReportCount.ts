const formatter = new Intl.NumberFormat("pt-BR")

function formatReportCount(value: number): string {
    return formatter.format(value)
}

export default formatReportCount
