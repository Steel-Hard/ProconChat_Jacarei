import { describe, expect, test } from "vitest"
import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import {
    formatarCategoriaSemPerguntas,
    formatarErroCategoria,
    formatarErroPergunta,
    formatarListaCategorias,
    formatarListaPerguntas,
    formatarRespostaFinal,
} from "./messageFormatter.service"

const categorias: Categoria[] = [
    { id: 1, title: "Contrato", active: true },
    { id: 2, title: "Garantias", active: true },
    { id: 3, title: "Cobrança Indevida", active: true },
]

const perguntas: Pergunta[] = [
    {
        id: 10,
        category_id: 1,
        question: "Posso cancelar o contrato?",
        legal_basis: "Art. 49 do CDC",
        answer: "Sim.",
        requires_in_person: false,
        out_of_scope: false,
        active: true,
    },
    {
        id: 11,
        category_id: 1,
        question: "Existe multa por cancelamento?",
        legal_basis: null,
        answer: "Depende do contrato.",
        requires_in_person: false,
        out_of_scope: false,
        active: true,
    },
]

const respostaBase: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Posso cancelar o contrato?",
    base_legal: "Art. 49 do CDC",
    resposta: "Sim, você pode cancelar em até 7 dias.",
    documentos_necessarios: ["Nota fiscal", "Comprovante de pagamento"],
    requer_presencial: false,
    fora_de_escopo: false,
}

describe("messageFormatter.service", () => {
    test("formatarListaCategorias numera as categorias em ordem", () => {
        const texto = formatarListaCategorias(categorias)

        expect(texto).toContain("1. Contrato")
        expect(texto).toContain("2. Garantias")
        expect(texto).toContain("3. Cobrança Indevida")
    })

    test("formatarErroCategoria re-lista as categorias numeradas", () => {
        const texto = formatarErroCategoria(categorias)

        expect(texto).toContain("1. Contrato")
        expect(texto).toContain("2. Garantias")
        expect(texto).toContain("3. Cobrança Indevida")
    })

    test("formatarListaPerguntas numera as perguntas em ordem", () => {
        const texto = formatarListaPerguntas(perguntas)

        expect(texto).toContain("1. Posso cancelar o contrato?")
        expect(texto).toContain("2. Existe multa por cancelamento?")
    })

    test("formatarErroPergunta re-lista as perguntas numeradas", () => {
        const texto = formatarErroPergunta(perguntas)

        expect(texto).toContain("1. Posso cancelar o contrato?")
        expect(texto).toContain("2. Existe multa por cancelamento?")
    })

    test("formatarCategoriaSemPerguntas informa a indisponibilidade", () => {
        expect(formatarCategoriaSemPerguntas()).toContain("não há perguntas cadastradas")
    })

    test("formatarRespostaFinal inclui categoria, pergunta, base legal, resposta e documentos", () => {
        const texto = formatarRespostaFinal(respostaBase)

        expect(texto).toContain("Contrato")
        expect(texto).toContain("Posso cancelar o contrato?")
        expect(texto).toContain("Art. 49 do CDC")
        expect(texto).toContain("Sim, você pode cancelar em até 7 dias.")
        expect(texto).toContain("Nota fiscal")
        expect(texto).toContain("Comprovante de pagamento")
    })

    test("formatarRespostaFinal nao inclui aviso presencial quando requer_presencial e falso", () => {
        const texto = formatarRespostaFinal(respostaBase)

        expect(texto).not.toContain("presencial")
    })

    test("formatarRespostaFinal inclui aviso de atendimento presencial quando requer_presencial e verdadeiro", () => {
        const texto = formatarRespostaFinal({ ...respostaBase, requer_presencial: true })

        expect(texto).toContain("presencial")
    })
})
