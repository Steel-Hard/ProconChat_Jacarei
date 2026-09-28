import { describe, expect, test } from "vitest"
import proconFaqSeed from "./procon-faq.data"

const codePoints = (text: string): number => [...text].length

const expectCleanText = (text: string, max: number): void => {
    expect(codePoints(text)).toBeGreaterThanOrEqual(1)
    expect(codePoints(text)).toBeLessThanOrEqual(max)
    expect(text).toBe(text.trim())
    expect(text).toBe(text.normalize("NFC"))
}

const keyPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/

const questions = proconFaqSeed.flatMap((category) =>
    category.questions.map((question) => ({ category, question }))
)

describe("procon-faq.data", () => {
    test("tem 7 categorias e 47 perguntas", () => {
        expect(proconFaqSeed).toHaveLength(7)
        expect(questions).toHaveLength(47)
    })

    test.each(proconFaqSeed.map((category) => [category.seedKey, category] as const))(
        "categoria %s tem shortTitle válido",
        (_key, category) => {
            expectCleanText(category.shortTitle, 24)
        }
    )

    test.each(questions.map(({ question }) => [question.seedKey, question] as const))(
        "pergunta %s tem shortTitle e shortDescription válidos",
        (_key, question) => {
            expectCleanText(question.shortTitle, 24)
            if (question.shortDescription !== undefined) {
                expectCleanText(question.shortDescription, 72)
            }
        }
    )

    test("shortTitle não se repete entre categorias nem dentro de uma categoria", () => {
        const categoryTitles = proconFaqSeed.map((category) => category.shortTitle)
        expect(new Set(categoryTitles).size).toBe(categoryTitles.length)
        for (const category of proconFaqSeed) {
            const titles = category.questions.map((question) => question.shortTitle)
            expect(new Set(titles).size, category.seedKey).toBe(titles.length)
        }
    })

    test("seedKey segue o formato, tem o prefixo da categoria e não se repete", () => {
        const keys: string[] = []
        for (const category of proconFaqSeed) {
            expect(category.seedKey).toMatch(keyPattern)
            expect(category.seedKey.length).toBeLessThanOrEqual(80)
            keys.push(category.seedKey)
            for (const question of category.questions) {
                const [prefix, slug, ...rest] = question.seedKey.split(".")
                expect(prefix, question.seedKey).toBe(category.seedKey)
                expect(slug, question.seedKey).toMatch(keyPattern)
                expect(rest, question.seedKey).toHaveLength(0)
                expect(question.seedKey.length).toBeLessThanOrEqual(80)
                keys.push(question.seedKey)
            }
        }
        expect(new Set(keys).size).toBe(keys.length)
    })

    test("pergunta fora do escopo é única, sem IA e sem atendimento presencial", () => {
        const outOfScope = questions.filter(({ question }) => question.outOfScope)
        expect(outOfScope).toHaveLength(1)
        for (const { question } of questions) {
            if (question.outOfScope) {
                expect(question.requiresInPerson, question.seedKey).toBe(false)
                expect(question.llmAllowed, question.seedKey).not.toBe(true)
            }
        }
    })

    test("respostas têm até 3.000 caracteres e documentos úteis são válidos", () => {
        for (const { question } of questions) {
            expect(codePoints(question.answer), question.seedKey).toBeLessThanOrEqual(3000)
            for (const document of question.requiredDocuments) {
                expect(document.length, question.seedKey).toBeGreaterThan(0)
                expect(codePoints(document), question.seedKey).toBeLessThanOrEqual(255)
                expect(document, question.seedKey).toBe(document.trim())
            }
        }
    })
})
