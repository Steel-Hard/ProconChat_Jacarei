import { describe, expect, it } from "vitest"
import { isRepeatedDocument } from "./documentMatch"

describe("isRepeatedDocument", () => {
    it("considera igual ignorando acento, maiúscula e espaços sobrando", () => {
        expect(isRepeatedDocument("Comprovante de endereço", "  comprovante  de ENDERECO ")).toBe(true)
    })

    it("considera repetido quando um documento está contido no outro", () => {
        expect(isRepeatedDocument("RG", "RG ou outro documento oficial com foto")).toBe(true)
        expect(isRepeatedDocument("RG ou outro documento oficial com foto", "rg")).toBe(true)
    })

    it("não considera repetido quando o texto só aparece no meio de outra palavra", () => {
        expect(isRepeatedDocument("RG", "Cargo de confiança")).toBe(false)
        expect(isRepeatedDocument("CPF", "Cópia do comprovante")).toBe(false)
    })
})
