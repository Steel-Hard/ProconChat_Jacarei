import { describe, expect, it } from "vitest"
import labelContentChange from "@/utils/content/labelContentChange"

const t = (key: string, params?: Record<string, unknown>) =>
    `${key}|${JSON.stringify(params ?? {})}`

describe("labelContentChange", () => {
    it("usa a chave do tipo de alteração com o nome", () => {
        expect(labelContentChange({ kind: "categoryNew", name: "C1" }, t)).toBe(
            'changes.categoryNew|{"name":"C1"}'
        )
    })

    it("diferencia ativar e desativar", () => {
        expect(labelContentChange({ kind: "questionState", name: "P", active: true }, t)).toBe(
            'changes.questionActivated|{"name":"P"}'
        )
        expect(labelContentChange({ kind: "questionState", name: "P", active: false }, t)).toBe(
            'changes.questionDeactivated|{"name":"P"}'
        )
        expect(labelContentChange({ kind: "categoryState", name: "C", active: false }, t)).toBe(
            'changes.categoryDeactivated|{"name":"C"}'
        )
    })

    it("usa chaves próprias para as ordens", () => {
        expect(labelContentChange({ kind: "categoriesOrder", name: "" }, t)).toBe(
            'changes.categoriesOrder|{"name":""}'
        )
        expect(labelContentChange({ kind: "questionsOrder", name: "C1" }, t)).toBe(
            'changes.questionsOrder|{"name":"C1"}'
        )
    })
})
