export function normalizeDocument(text: string): string {
    return text
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
}

function words(text: string): string[] {
    return normalizeDocument(text)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length > 0)
}

function containsSequence(whole: string[], part: string[]): boolean {
    if (part.length === 0 || part.length > whole.length) {
        return false
    }
    for (let start = 0; start + part.length <= whole.length; start++) {
        if (part.every((word, offset) => whole[start + offset] === word)) {
            return true
        }
    }
    return false
}

export function isRepeatedDocument(first: string, second: string): boolean {
    const a = words(first)
    const b = words(second)
    return containsSequence(a, b) || containsSequence(b, a)
}
