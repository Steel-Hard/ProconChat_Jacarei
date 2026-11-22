import type MisspelledPlaceholder from "@/types/content/MisspelledPlaceholder.types"
import editDistance from "@/utils/content/editDistance"
import normalizeComparisonText from "@/utils/content/normalizeComparisonText"

const OPENING_BRACES = /\{+/g

const MAX_EDIT_DISTANCE = 2

const MIN_PREFIX_LENGTH = 3

const CANONICAL_PLACEHOLDERS = ["{endereco}", "{horarios}"]

function expectedPlaceholderOf(name: string): string | null {
    const normalized = normalizeComparisonText(name).replace(/\s+/g, "")

    return (
        CANONICAL_PLACEHOLDERS.find((placeholder) => {
            const target = placeholder.slice(1, -1)

            return (
                editDistance(normalized, target) <= MAX_EDIT_DISTANCE ||
                (normalized.length >= MIN_PREFIX_LENGTH && target.startsWith(normalized))
            )
        }) ?? null
    )
}

function nextBraceIndex(text: string, from: number): number {
    const index = text.slice(from).search(/[{}]/)

    return index === -1 ? text.length : from + index
}

function closingRunEnd(text: string, from: number): number {
    let end = from

    while (text[end] === "}") {
        end++
    }

    return end
}

function firstWordOf(segment: string): string {
    return segment.split(/\s/, 1)[0]
}

function isExactPlaceholder(found: string): boolean {
    return CANONICAL_PLACEHOLDERS.includes(found)
}

export default function findMisspelledPlaceholders(answer: string): MisspelledPlaceholder[] {
    const misspelled = new Map<string, MisspelledPlaceholder>()

    function register(found: string, expected: string | null) {
        if (expected && !isExactPlaceholder(found) && !misspelled.has(found)) {
            misspelled.set(found, { found, expected })
        }
    }

    for (const opening of answer.matchAll(OPENING_BRACES)) {
        const start = opening.index
        const contentStart = start + opening[0].length
        const contentEnd = nextBraceIndex(answer, contentStart)
        const segment = answer.slice(contentStart, contentEnd)

        if (answer[contentEnd] === "}") {
            const closed = answer.slice(start, closingRunEnd(answer, contentEnd))
            const expected = expectedPlaceholderOf(segment)

            if (expected) {
                register(closed, expected)
                continue
            }
        }

        const word = firstWordOf(segment)

        register(answer.slice(start, contentStart + word.length), expectedPlaceholderOf(word))
    }

    return [...misspelled.values()]
}
