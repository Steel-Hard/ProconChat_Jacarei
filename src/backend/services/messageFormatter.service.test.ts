import { describe, expect, test } from "vitest"
import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import {
    AVISO_NAO_VINCULANTE,
    formatarCategoriaSemPerguntas,
    formatarConfirmacaoAgendamento,
    formatarErroCategoria,
    formatarErroPergunta,
    formatarListaCategorias,
    formatarListaPerguntas,
    formatarListaSlots,
    formatarRespostaFinal,
    paginarItens,
    criarBotoesAttendee,
    criarMensagensCategorias,
    criarMensagensPerguntas,
    criarMensagensSlots,
    formatarErroSlot,
    ERRO_NOME,
} from "./messageFormatter.service"
import type { OutgoingMessage } from "../types/message.types"
import type { AvailableSlot } from "../types/schedule.types"

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
            expect(p2.opcaoAnterior).toBe(3)
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

    describe("Formatação de Agendamento (#56)", () => {
        test("ERRO_NOME explica ao cidadão que o nome deve ter apenas letras", () => {
            expect(ERRO_NOME).toBe("Por favor, digite o nome completo usando apenas letras (entre 2 e 150 caracteres):")
        })

        test("formatarListaSlots formata slots disponíveis com paginação", () => {
            const slots = [
                {
                    datetime: new Date("2026-10-06T08:00:00-03:00"),
                    dateStr: "2026-10-06",
                    timeStr: "08:00",
                    formatted: "Terça-feira, 06/10 às 08:00",
                    remainingSeats: 2,
                },
                {
                    datetime: new Date("2026-10-06T08:30:00-03:00"),
                    dateStr: "2026-10-06",
                    timeStr: "08:30",
                    formatted: "Terça-feira, 06/10 às 08:30",
                    remainingSeats: 1,
                },
            ]

            const texto = formatarListaSlots(slots, 1)
            expect(texto).toContain("1. Terça-feira, 06/10 às 08:00")
            expect(texto).toContain("2. Terça-feira, 06/10 às 08:30")
        })

        test("criarBotoesAttendee gera botões válidos para quem comparece", () => {
            const botoes = criarBotoesAttendee()
            expect(botoes).toHaveLength(2)
            expect(botoes[0]).toEqual({ id: "attendee_self", title: "Eu mesmo" })
            expect(botoes[1]).toEqual({ id: "attendee_rep", title: "Outra pessoa por mim" })
            for (const btn of botoes) {
                expect(btn.title.length).toBeLessThanOrEqual(20)
            }
        })

        test("criarMensagensSlots gera lista interativa com limites da Cloud API", () => {
            const slots = [
                {
                    datetime: new Date("2026-10-06T08:00:00-03:00"),
                    dateStr: "2026-10-06",
                    timeStr: "08:00",
                    formatted: "Terça-feira, 06/10 às 08:00",
                    remainingSeats: 2,
                },
            ]

            const msgs = criarMensagensSlots(slots, 1)
            expect(msgs).toHaveLength(1)
            const listMsg = msgs[0]!
            expect(listMsg.type).toBe("list")
            if (listMsg.type === "list") {
                expect(listMsg.buttonText.length).toBeLessThanOrEqual(20)
                expect(listMsg.rows).toHaveLength(1)
                expect(listMsg.rows[0]?.id).toBe(`slot_${slots[0]!.datetime.toISOString()}`)
                expect(listMsg.rows[0]?.title.length).toBeLessThanOrEqual(24)
                expect(listMsg.rows[0]?.description?.length).toBeLessThanOrEqual(72)
            }
        })

        test("criarMensagensSlots e formatarListaSlots suportam paginação com Ver mais e Voltar opções", () => {
            const slots = Array.from({ length: 15 }, (_, i) => {
                const hour = String(8 + Math.floor(i / 2)).padStart(2, "0")
                const minute = i % 2 === 0 ? "00" : "30"
                return {
                    datetime: new Date(`2026-10-06T${hour}:${minute}:00-03:00`),
                    dateStr: "2026-10-06",
                    timeStr: `${hour}:${minute}`,
                    formatted: `Terça-feira, 06/10 às ${hour}:${minute}`,
                    remainingSeats: 2,
                }
            })

            const msgsPage1 = criarMensagensSlots(slots, 1)
            expect(msgsPage1).toHaveLength(1)
            const listMsg1 = msgsPage1[0]!
            expect(listMsg1.type).toBe("list")
            if (listMsg1.type === "list") {
                expect(listMsg1.rows).toHaveLength(10)
                const lastRow = listMsg1.rows[9]!
                expect(lastRow.id).toBe("page_2")
                expect(lastRow.title).toBe("Ver mais opções")
            }

            const textoPage1 = formatarListaSlots(slots, 1)
            expect(textoPage1).toContain("Ver mais opções")

            const msgsPage2 = criarMensagensSlots(slots, 2)
            expect(msgsPage2).toHaveLength(1)
            const listMsg2 = msgsPage2[0]!
            expect(listMsg2.type).toBe("list")
            if (listMsg2.type === "list") {
                expect(listMsg2.rows.some((r) => r.id === "page_1" && r.title === "Voltar opções")).toBe(true)
            }

            const textoPage2 = formatarListaSlots(slots, 2)
            expect(textoPage2).toContain("Voltar para opções anteriores")
        })

        test("formatarConfirmacaoAgendamento gera mensagem completa com documentos, endereco e avisos", () => {
            const texto = formatarConfirmacaoAgendamento({
                protocol: "A3F9C21B",
                quando: "quarta-feira, 07/10 às 09:30",
                unitAddress: "Rua do Procon, 100",
                unitAddressComplement: "Centro",
                byRepresentative: false,
                groupDocuments: ["RG", "CPF"],
                questionDocuments: ["Contrato"],
                reminderEnabled: true,
                reminderHours: 24,
            })

            expect(texto).toContain("Agendamento realizado")
            expect(texto).toContain("Protocolo: A3F9C21B")
            expect(texto).toContain("Data e hora: quarta-feira, 07/10 às 09:30")
            expect(texto).toContain("Endereço: Rua do Procon, 100 (Centro)")
            expect(texto).toContain("Leve ao atendimento:")
            expect(texto).toContain("• RG")
            expect(texto).toContain("• CPF")
            expect(texto).toContain("Documentos úteis para esta dúvida:")
            expect(texto).toContain("• Contrato")
            expect(texto).toContain("lembrete 24 horas antes do atendimento e o aviso em caso de cancelamento")
            expect(texto).not.toContain("remarcar")
        })

        test("formatarConfirmacaoAgendamento quando representante comparece", () => {
            const texto = formatarConfirmacaoAgendamento({
                protocol: "A3F9C21B",
                quando: "quarta-feira, 07/10 às 09:30",
                unitAddress: "Rua do Procon, 100",
                byRepresentative: true,
                groupDocuments: ["Procuração"],
                questionDocuments: [],
                reminderEnabled: false,
                reminderHours: 24,
            })

            expect(texto).toContain("A pessoa que comparecer em seu nome deve levar:")
            expect(texto).toContain("• Procuração")
            expect(texto).not.toContain("Documentos úteis para esta dúvida:")
            expect(texto).toContain("como o aviso em caso de cancelamento")
        })
    })

    describe("Linhas de paginação das listas do bot", () => {
        const vinteCategorias: Categoria[] = Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Categoria ${i + 1}`,
            description: `Descrição ${i + 1}`,
            active: true,
        }))

        const vintePerguntas: Pergunta[] = Array.from({ length: 20 }, (_, i) => ({
            id: 100 + i,
            category_id: 1,
            question: `Pergunta ${i + 1}`,
            legal_basis: null,
            answer: "Resposta.",
            requires_in_person: false,
            out_of_scope: false,
            active: true,
        }))

        const vinteSlots: AvailableSlot[] = Array.from({ length: 20 }, (_, i) => {
            const hora = `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`
            return {
                datetime: new Date(`2026-10-06T${hora}:00-03:00`),
                dateStr: "2026-10-06",
                timeStr: hora,
                formatted: `Terça-feira, 06/10 às ${hora}`,
                remainingSeats: i % 2 === 0 ? 2 : 1,
            }
        })

        function linhasDaLista(mensagens: OutgoingMessage[]) {
            const lista = mensagens.find((mensagem) => mensagem.type === "list")
            return lista?.type === "list" ? lista.rows : []
        }

        test("criarMensagensCategorias na primeira página de 20 itens termina com Ver mais opções", () => {
            const linhas = linhasDaLista(criarMensagensCategorias(vinteCategorias, 1))

            expect(linhas).toEqual([
                { id: "cat_1", title: "Categoria 1", description: "Descrição 1" },
                { id: "cat_2", title: "Categoria 2", description: "Descrição 2" },
                { id: "cat_3", title: "Categoria 3", description: "Descrição 3" },
                { id: "cat_4", title: "Categoria 4", description: "Descrição 4" },
                { id: "cat_5", title: "Categoria 5", description: "Descrição 5" },
                { id: "cat_6", title: "Categoria 6", description: "Descrição 6" },
                { id: "cat_7", title: "Categoria 7", description: "Descrição 7" },
                { id: "cat_8", title: "Categoria 8", description: "Descrição 8" },
                { id: "cat_9", title: "Categoria 9", description: "Descrição 9" },
                { id: "page_2", title: "Ver mais opções", description: "Exibir mais categorias" },
            ])
        })

        test("criarMensagensCategorias numa página do meio traz Voltar opções e Ver mais opções", () => {
            const linhas = linhasDaLista(criarMensagensCategorias(vinteCategorias, 2))

            expect(linhas).toEqual([
                { id: "cat_10", title: "Categoria 10", description: "Descrição 10" },
                { id: "cat_11", title: "Categoria 11", description: "Descrição 11" },
                { id: "cat_12", title: "Categoria 12", description: "Descrição 12" },
                { id: "cat_13", title: "Categoria 13", description: "Descrição 13" },
                { id: "cat_14", title: "Categoria 14", description: "Descrição 14" },
                { id: "cat_15", title: "Categoria 15", description: "Descrição 15" },
                { id: "cat_16", title: "Categoria 16", description: "Descrição 16" },
                { id: "cat_17", title: "Categoria 17", description: "Descrição 17" },
                { id: "page_1", title: "Voltar opções", description: "Ver categorias anteriores" },
                { id: "page_3", title: "Ver mais opções", description: "Exibir mais categorias" },
            ])
        })

        test("criarMensagensPerguntas na última página termina só com Voltar opções", () => {
            const linhas = linhasDaLista(criarMensagensPerguntas(vintePerguntas, 3))

            expect(linhas).toEqual([
                { id: "q_117", title: "Pergunta 18", description: undefined },
                { id: "q_118", title: "Pergunta 19", description: undefined },
                { id: "q_119", title: "Pergunta 20", description: undefined },
                { id: "page_2", title: "Voltar opções", description: "Ver perguntas anteriores" },
            ])
        })

        test("criarMensagensSlots numa página do meio traz Voltar opções e Ver mais opções", () => {
            const linhas = linhasDaLista(criarMensagensSlots(vinteSlots, 2))

            expect(linhas).toEqual([
                {
                    id: `slot_${new Date("2026-10-06T12:30:00-03:00").toISOString()}`,
                    title: "Ter, 06/10 às 12:30",
                    description: "1 vaga disponível",
                },
                {
                    id: `slot_${new Date("2026-10-06T13:00:00-03:00").toISOString()}`,
                    title: "Ter, 06/10 às 13:00",
                    description: "2 vagas disponíveis",
                },
                {
                    id: `slot_${new Date("2026-10-06T13:30:00-03:00").toISOString()}`,
                    title: "Ter, 06/10 às 13:30",
                    description: "1 vaga disponível",
                },
                {
                    id: `slot_${new Date("2026-10-06T14:00:00-03:00").toISOString()}`,
                    title: "Ter, 06/10 às 14:00",
                    description: "2 vagas disponíveis",
                },
                {
                    id: `slot_${new Date("2026-10-06T14:30:00-03:00").toISOString()}`,
                    title: "Ter, 06/10 às 14:30",
                    description: "1 vaga disponível",
                },
                {
                    id: `slot_${new Date("2026-10-06T15:00:00-03:00").toISOString()}`,
                    title: "Ter, 06/10 às 15:00",
                    description: "2 vagas disponíveis",
                },
                {
                    id: `slot_${new Date("2026-10-06T15:30:00-03:00").toISOString()}`,
                    title: "Ter, 06/10 às 15:30",
                    description: "1 vaga disponível",
                },
                {
                    id: `slot_${new Date("2026-10-06T16:00:00-03:00").toISOString()}`,
                    title: "Ter, 06/10 às 16:00",
                    description: "2 vagas disponíveis",
                },
                { id: "page_1", title: "Voltar opções", description: "Ver horários anteriores" },
                { id: "page_3", title: "Ver mais opções", description: "Exibir mais horários" },
            ])
        })

        test("formatarListaSlots numa página do meio numera os horários e as opções de navegação", () => {
            const texto = formatarListaSlots(vinteSlots, 2)

            expect(texto).toEqual(
                [
                    "Escolha um dos horários disponíveis para o atendimento presencial:",
                    "1. Terça-feira, 06/10 às 12:30",
                    "2. Terça-feira, 06/10 às 13:00",
                    "3. Terça-feira, 06/10 às 13:30",
                    "4. Terça-feira, 06/10 às 14:00",
                    "5. Terça-feira, 06/10 às 14:30",
                    "6. Terça-feira, 06/10 às 15:00",
                    "7. Terça-feira, 06/10 às 15:30",
                    "8. Terça-feira, 06/10 às 16:00",
                    "9. Voltar para opções anteriores",
                    "10. Ver mais opções",
                ].join("\n"),
            )
        })

        test("formatarErroSlot na última página repete os horários com a opção de voltar", () => {
            const texto = formatarErroSlot(vinteSlots, 3)

            expect(texto).toEqual(
                [
                    "Por favor, escolha um dos horários disponíveis na lista abaixo:",
                    "1. Terça-feira, 06/10 às 16:30",
                    "2. Terça-feira, 06/10 às 17:00",
                    "3. Terça-feira, 06/10 às 17:30",
                    "4. Voltar para opções anteriores",
                ].join("\n"),
            )
        })
    })
})
