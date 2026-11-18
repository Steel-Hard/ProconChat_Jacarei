const formatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
})

function formatReportPercent(value: number): string {
    return formatter.format(value)
}

export default formatReportPercent
