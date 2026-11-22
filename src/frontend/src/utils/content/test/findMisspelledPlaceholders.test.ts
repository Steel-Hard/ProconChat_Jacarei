import { describe, expect, it } from "vitest"
import findMisspelledPlaceholders from "@/utils/content/findMisspelledPlaceholders"

describe("findMisspelledPlaceholders", () => {
    it.each([
        ["{Endereco}", "{endereco}"],
        ["{endereço}", "{endereco}"],
        ["{ endereco }", "{endereco}"],
        ["{ENDERECO}", "{endereco}"],
        ["{enderecos}", "{endereco}"],
        ["{horario}", "{horarios}"],
        ["{Horários}", "{horarios}"],
        ["{ Horario }", "{horarios}"]
    ])("aponta %s e sugere %s", (found, expected) => {
        expect(findMisspelledPlaceholders(`Atendemos em ${found} hoje.`)).toEqual([
            { found, expected }
        ])
    })

    it("não aponta os marcadores escritos corretamente", () => {
        expect(findMisspelledPlaceholders("Em {endereco}, de {horarios}.")).toEqual([])
    })

    it("ignora outras chaves e texto sem chaves", () => {
        expect(findMisspelledPlaceholders("Olá {nome}, venha.")).toEqual([])
        expect(findMisspelledPlaceholders("")).toEqual([])
        expect(findMisspelledPlaceholders("Sem chaves")).toEqual([])
    })

    it("lista todos os trechos errados, sem repetir o mesmo trecho", () => {
        expect(
            findMisspelledPlaceholders("{Endereco} e {Horario} e {Endereco} e {endereco}")
        ).toEqual([
            { found: "{Endereco}", expected: "{endereco}" },
            { found: "{Horario}", expected: "{horarios}" }
        ])
    })
})
