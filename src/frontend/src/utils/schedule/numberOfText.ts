const NUMBER_TEXT = /^\d+([.,]\d+)?$/

function numberOfText(value: string): number | null {
    return NUMBER_TEXT.test(value) ? Number(value.replace(",", ".")) : null
}

export default numberOfText
