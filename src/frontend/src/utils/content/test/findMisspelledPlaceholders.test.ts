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

    it.each([
        ["{{endereco}}", "{endereco}"],
        ["{{horarios}}", "{horarios}"],
        ["{endereco}}", "{endereco}"],
        ["{{endereco}", "{endereco}"]
    ])("aponta as chaves duplas ou sobrando em %s", (found, expected) => {
        expect(findMisspelledPlaceholders(`Atendemos em ${found} hoje.`)).toEqual([
            { found, expected }
        ])
    })

    it.each([
        ["{endereçoo}", "{endereco}"],
        ["{enderco}", "{endereco}"],
        ["{endareco}", "{endereco}"],
        ["{horarioss}", "{horarios}"],
        ["{horaros}", "{horarios}"],
        ["{end}", "{endereco}"],
        ["{hora}", "{horarios}"],
        ["{horas}", "{horarios}"],
        ["{hor}", "{horarios}"],
        ["{ ender }", "{endereco}"]
    ])("aponta o erro de digitação em %s", (found, expected) => {
        expect(findMisspelledPlaceholders(`Atendemos em ${found} hoje.`)).toEqual([
            { found, expected }
        ])
    })

    it("aponta a chave sem fechar no meio e no fim do texto", () => {
        expect(findMisspelledPlaceholders("Fica em {endereco hoje")).toEqual([
            { found: "{endereco", expected: "{endereco}" }
        ])
        expect(findMisspelledPlaceholders("Atendemos de {horarios")).toEqual([
            { found: "{horarios", expected: "{horarios}" }
        ])
    })

    it.each(["{nome}", "{cep}", "{en}", "{ho}", "{}", "{ }", "{protocolo}"])(
        "ignora a chave sem relação %s",
        (unrelated) => {
            expect(findMisspelledPlaceholders(`Texto ${unrelated} fim.`)).toEqual([])
        }
    )

    it("ignora chave sem fechar de palavra sem relação", () => {
        expect(findMisspelledPlaceholders("Texto {nome sem fechar")).toEqual([])
    })

    it("não mistura um marcador correto com o erro vizinho", () => {
        expect(findMisspelledPlaceholders("{endereco} e {{horarios}}")).toEqual([
            { found: "{{horarios}}", expected: "{horarios}" }
        ])
    })
})
