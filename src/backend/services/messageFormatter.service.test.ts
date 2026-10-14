import { describe, expect, test } from "vitest"
import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import {
    AVISO_NAO_VINCULANTE,
    formatarCategoriaSemPerguntas,
    formatarErroCategoria,
    formatarErroPergunta,
    formatarListaCategorias,
    formatarListaPerguntas,
    formatarRespostaFinal,
    paginarItens,
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

    test("formatarRespostaFinal inclui categoria, pergunta, base legal, resposta, documentos e 'O que fazer agora'", () => {
        const texto = formatarRespostaFinal(respostaBase)

        expect(texto).toContain("Contrato")
        expect(texto).toContain("Posso cancelar o contrato?")
        expect(texto).toContain("Art. 49 do CDC")
        expect(texto).toContain("Sim, você pode cancelar em até 7 dias.")
        expect(texto).toContain("Nota fiscal")
        expect(texto).toContain("Comprovante de pagamento")
        expect(texto).toContain("O que fazer agora")
    })

    test("formatarRespostaFinal nao inclui aviso presencial quando requer_presencial e falso", () => {
        const texto = formatarRespostaFinal(respostaBase)

        expect(texto).not.toContain("Esta situação pode exigir atendimento presencial")
    })

    test("formatarRespostaFinal inclui aviso de atendimento presencial quando requer_presencial e verdadeiro", () => {
        const texto = formatarRespostaFinal({ ...respostaBase, requer_presencial: true })

        expect(texto).toContain("Esta situação pode exigir atendimento presencial")
    })

    test("formatarRespostaFinal inclui o aviso de carater nao vinculante quando requer_presencial e falso", () => {
        const texto = formatarRespostaFinal(respostaBase)

        expect(texto).toContain(AVISO_NAO_VINCULANTE)
    })

    test("formatarRespostaFinal inclui o aviso de carater nao vinculante quando requer_presencial e verdadeiro", () => {
        const texto = formatarRespostaFinal({ ...respostaBase, requer_presencial: true })

        expect(texto).toContain(AVISO_NAO_VINCULANTE)
    })

    test("formatarListaCategorias menciona o carater informativo e LGPD na saudacao de abertura", () => {
        const texto = formatarListaCategorias(categorias)

        expect(texto).toContain("caráter informativo")
        expect(texto).toContain("LGPD")
        expect(texto).not.toContain(AVISO_NAO_VINCULANTE)
    })

    describe("Paginação de listas (Decisão 001)", () => {
        const gerarItens = (qtd: number) => Array.from({ length: qtd }, (_, i) => `Item ${i + 1}`)

        test("Lista com 10 itens tem 1 única página sem botões de paginação", () => {
            const itens = gerarItens(10)
            const p1 = paginarItens(itens, 1)

            expect(p1.totalPaginas).toBe(1)
            expect(p1.itensPagina.length).toBe(10)
            expect(p1.temProxima).toBe(false)
            expect(p1.temAnterior).toBe(false)
            expect(p1.opcaoProxima).toBeUndefined()
            expect(p1.opcaoAnterior).toBeUndefined()
        })

        test("Lista com 11 itens: P1 com 9 itens + 'Ver mais'; P2 com 2 itens + 'Voltar'", () => {
            const itens = gerarItens(11)

            const p1 = paginarItens(itens, 1)
            expect(p1.totalPaginas).toBe(2)
            expect(p1.itensPagina.length).toBe(9)
            expect(p1.temProxima).toBe(true)
            expect(p1.opcaoProxima).toBe(10)

            const p2 = paginarItens(itens, 2)
            expect(p2.itensPagina.length).toBe(2)
            expect(p2.temAnterior).toBe(true)
            expect(p2.temProxima).toBe(false)
            expect(p2.opcaoAnterior).toBe(3) // 2 itens + voltar
        })

        test("Lista com 20 itens: 3 páginas (P1: 9, P2: 8, P3: 3)", () => {
            const itens = gerarItens(20)

            const p1 = paginarItens(itens, 1)
            expect(p1.totalPaginas).toBe(3)
            expect(p1.itensPagina.length).toBe(9)
            expect(p1.opcaoProxima).toBe(10)

            const p2 = paginarItens(itens, 2)
            expect(p2.itensPagina.length).toBe(8)
            expect(p2.temAnterior).toBe(true)
            expect(p2.temProxima).toBe(true)
            expect(p2.opcaoAnterior).toBe(9)
            expect(p2.opcaoProxima).toBe(10)

            const p3 = paginarItens(itens, 3)
            expect(p3.itensPagina.length).toBe(3)
            expect(p3.temAnterior).toBe(true)
            expect(p3.temProxima).toBe(false)
            expect(p3.opcaoAnterior).toBe(4)
        })

        test("Lista com 30 itens: 4 páginas (P1: 9, P2: 8, P3: 8, P4: 5)", () => {
            const itens = gerarItens(30)

            const p1 = paginarItens(itens, 1)
            expect(p1.totalPaginas).toBe(4)
            expect(p1.itensPagina.length).toBe(9)

            const p2 = paginarItens(itens, 2)
            expect(p2.itensPagina.length).toBe(8)
            expect(p2.opcaoAnterior).toBe(9)
            expect(p2.opcaoProxima).toBe(10)

            const p3 = paginarItens(itens, 3)
            expect(p3.itensPagina.length).toBe(8)
            expect(p3.opcaoAnterior).toBe(9)
            expect(p3.opcaoProxima).toBe(10)

            const p4 = paginarItens(itens, 4)
            expect(p4.itensPagina.length).toBe(5)
            expect(p4.opcaoAnterior).toBe(6)
            expect(p4.temProxima).toBe(false)
        })
    })
})
