import { describe, expect, it } from "vitest"
import {
    findDuplicateDocuments,
    isDuplicateDocument
} from "@/utils/documents/findDuplicateDocuments"

describe("findDuplicateDocuments", () => {
    it("identifica documentos com texto idêntico", () => {
        expect(isDuplicateDocument("CPF", ["CPF", "RG"])).toBe(true)
        expect(isDuplicateDocument("Comprovante de pagamento", ["Comprovante de pagamento"])).toBe(
            true
        )
    })

    it("identifica documentos ignorando maiúsculas e minúsculas", () => {
        expect(isDuplicateDocument("cpf", ["CPF"])).toBe(true)
        expect(isDuplicateDocument("RG", ["rg com foto"])).toBe(true)
    })

    it("não confunde documentos diferentes que compartilham palavras comuns", () => {
        expect(isDuplicateDocument("Comprovante de endereço", ["Comprovante de pagamento"])).toBe(
            false
        )
    })

    it("findDuplicateDocuments devolve o conjunto dos itens repetidos", () => {
        const group = ["RG ou outro documento", "CPF", "Comprovante de endereço"]
        const question = ["RG com foto", "Nota fiscal", "CPF"]

        const duplicates = findDuplicateDocuments(group, question)
        expect(duplicates.has("CPF")).toBe(true)
        expect(duplicates.has("Comprovante de endereço")).toBe(false)
    })
})
