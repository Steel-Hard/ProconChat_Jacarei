const formatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

function formatReportAverage(value: number): string {
    return formatter.format(value)
}

export default formatReportAverage
