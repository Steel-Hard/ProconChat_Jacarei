import { describe, expect, it } from "vitest"
import {
    categoryCountsOf,
    isCategoryHiddenInChatbot,
    isCategoryVisibleInChatbot
} from "@/utils/content/categoryVisibility"

const category = (active: boolean) => ({ active })
const question = (active: boolean) => ({ active })

describe("categoryVisibility", () => {
    it("conta perguntas e perguntas ativas", () => {
        expect(categoryCountsOf([question(true), question(false), question(true)])).toEqual({
            questionsCount: 3,
            activeQuestionsCount: 2
        })
    })

    it("marca como oculta a categoria ativa sem pergunta ativa", () => {
        expect(isCategoryHiddenInChatbot(category(true), [question(false)])).toBe(true)
        expect(isCategoryHiddenInChatbot(category(true), [])).toBe(true)
    })

    it("não marca como oculta a categoria ativa com pergunta ativa", () => {
        expect(isCategoryHiddenInChatbot(category(true), [question(true)])).toBe(false)
    })

    it("não marca como oculta a categoria inativa", () => {
        expect(isCategoryHiddenInChatbot(category(false), [question(false)])).toBe(false)
    })

    it("só mostra no chatbot a categoria ativa com pergunta ativa", () => {
        expect(isCategoryVisibleInChatbot(category(true), [question(true)])).toBe(true)
        expect(isCategoryVisibleInChatbot(category(false), [question(true)])).toBe(false)
        expect(isCategoryVisibleInChatbot(category(true), [question(false)])).toBe(false)
    })
})
