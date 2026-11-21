import { describe, expect, it } from "vitest"
import duplicateDocuments from "@/utils/content/duplicateDocuments"

describe("duplicateDocuments", () => {
    it("acha repetidos sem diferenciar acento, maiúscula e espaços", () => {
        expect(duplicateDocuments(["Nota fiscal", "RG", "nota físcal "])).toEqual([2])
    })

    it("devolve vazio quando não há repetidos", () => {
        expect(duplicateDocuments(["Nota fiscal", "RG"])).toEqual([])
    })

    it("não considera repetidos os itens vazios", () => {
        expect(duplicateDocuments(["", " "])).toEqual([])
    })
})
