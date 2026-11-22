import type MisspelledPlaceholder from "@/types/content/MisspelledPlaceholder.types"
import normalizeComparisonText from "@/utils/content/normalizeComparisonText"

const BRACED_TEXT = /\{([^{}]*)\}/g

const CANONICAL_BY_NORMALIZED_NAME: Record<string, string> = {
    endereco: "{endereco}",
    enderecos: "{endereco}",
    horario: "{horarios}",
    horarios: "{horarios}"
}

const VALID_PLACEHOLDERS = new Set(["{endereco}", "{horarios}"])

export default function findMisspelledPlaceholders(answer: string): MisspelledPlaceholder[] {
    const misspelled = new Map<string, MisspelledPlaceholder>()

    for (const [found, name] of answer.matchAll(BRACED_TEXT)) {
        const expected =
            CANONICAL_BY_NORMALIZED_NAME[normalizeComparisonText(name).replace(/\s+/g, "")]

        if (expected && !VALID_PLACEHOLDERS.has(found) && !misspelled.has(found)) {
            misspelled.set(found, { found, expected })
        }
    }

    return [...misspelled.values()]
}
