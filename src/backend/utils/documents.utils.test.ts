import { describe, expect, it } from "vitest"
import { isDocumentsConfigDifferent } from "./documents.utils"

describe("isDocumentsConfigDifferent", () => {
    it("devolve false quando as listas enviadas são iguais à configuração atual", () => {
        const current = { group: ["RG", "Comprovante"], question: ["Nota fiscal"] }

        const result = isDocumentsConfigDifferent(
            { group: ["RG", "Comprovante"], question: ["Nota fiscal"] },
            current,
        )

        expect(result).toBe(false)
    })

    it("devolve false quando a mesma lista foi enviada em outra ordem", () => {
        const current = { group: ["RG", "Comprovante"], question: ["Nota fiscal", "Contrato"] }

        const result = isDocumentsConfigDifferent(
            { group: ["Comprovante", "RG"], question: ["Contrato", "Nota fiscal"] },
            current,
        )

        expect(result).toBe(false)
    })

    it("devolve true quando os documentos do grupo diferem", () => {
        const current = { group: ["RG", "Comprovante"], question: ["Nota fiscal"] }

        const result = isDocumentsConfigDifferent(
            { group: ["RG"], question: ["Nota fiscal"] },
            current,
        )

        expect(result).toBe(true)
    })

    it("devolve true quando os documentos da pergunta diferem, inclusive com a lista ausente", () => {
        const current = { group: ["RG"], question: ["Nota fiscal"] }

        const different = isDocumentsConfigDifferent(
            { group: ["RG"], question: ["Contrato"] },
            current,
        )
        const missing = isDocumentsConfigDifferent({ group: ["RG"] }, current)

        expect(different).toBe(true)
        expect(missing).toBe(true)
    })
})
