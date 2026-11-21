import { describe, expect, it } from "vitest"
import { IMotorDecisaoRepository } from "../repositories/motorDecisao.repository.interface"
import { CategoryRecord, QuestionPreviewInput } from "../types/content.types"
import { Pergunta } from "../types/motorDecisao.types"
import { AI_SAMPLE_TEXT, buildQuestionPreview, SchedulePlaceholdersSource } from "./contentRules"
import { mensagensRespostaOficial, montarMensagemIa } from "./messageFormatter.service"
import { MotorDecisaoService } from "./motorDecisao.service"

const CATEGORY_TITLE = "Compras e Garantias"

const category: CategoryRecord = {
    id: 1,
    title: CATEGORY_TITLE,
    shortTitle: "Compras",
    description: null,
    active: true,
    position: 0,
    questionsCount: 1,
    activeQuestionsCount: 1,
    updatedBy: null,
    updatedAt: "2026-11-20T10:00:00.000Z",
}

interface StoredQuestion {
    question: string
    answer: string
    legalBasis: string | null
    documents: string[]
    requiresInPerson: boolean
    inPersonNote: string | null
    outOfScope: boolean
    llmAllowed: boolean
}

function botRepository(stored: StoredQuestion): IMotorDecisaoRepository {
    const pergunta: Pergunta = {
        id: 1,
        category_id: 1,
        question: stored.question,
        short_title: "Título",
        short_description: null,
        legal_basis: stored.legalBasis,
        answer: stored.answer,
        requires_in_person: stored.requiresInPerson,
        in_person_note: stored.inPersonNote,
        out_of_scope: stored.outOfScope,
        llm_allowed: stored.llmAllowed,
        active: true,
    }
    return {
        getCategoriasAtivas: async () => [{ id: 1, title: CATEGORY_TITLE, active: true }],
        getPerguntasAtivasPorCategoria: async () => [pergunta],
        getPerguntaById: async () => pergunta,
        getCategoriaById: async () => ({ id: 1, title: CATEGORY_TITLE, active: true }),
        getDocumentosPorPergunta: async () =>
            stored.documents.map((description, index) => ({ id: index + 1, question_id: 1, description })),
    }
}

function previewInputOf(stored: StoredQuestion): QuestionPreviewInput {
    return {
        questionId: 1,
        categoryId: 1,
        shortTitle: "Título",
        shortDescription: null,
        question: stored.question,
        answer: stored.answer,
        legalBasis: stored.legalBasis,
        requiredDocuments: stored.documents,
        requiresInPerson: stored.requiresInPerson,
        inPersonNote: stored.requiresInPerson ? stored.inPersonNote : null,
        outOfScope: stored.outOfScope,
        llmAllowed: stored.llmAllowed,
    }
}

const base: StoredQuestion = {
    question: "Comprei um produto com defeito, o que fazer?",
    answer: "O fornecedor tem até 30 dias para reparar o produto.",
    legalBasis: "Art. 18 do CDC",
    documents: ["Nota fiscal", "RG ou CNH"],
    requiresInPerson: false,
    inPersonNote: null,
    outOfScope: false,
    llmAllowed: true,
}

const cases: [string, StoredQuestion][] = [
    ["pergunta comum", base],
    ["pergunta comum sem base legal e sem documentos", { ...base, legalBasis: null, documents: [] }],
    ["pergunta presencial com observação", { ...base, requiresInPerson: true, inPersonNote: "Traga as faturas impressas." }],
    ["pergunta presencial sem observação", { ...base, requiresInPerson: true, inPersonNote: null }],
    ["pergunta presencial com observação em branco", { ...base, requiresInPerson: true, inPersonNote: "   " }],
    ["pergunta fora do escopo", { ...base, outOfScope: true, llmAllowed: false, requiresInPerson: false }],
    ["pergunta fora do escopo sem base legal e sem documentos", { ...base, outOfScope: true, llmAllowed: false, legalBasis: null, documents: [] }],
    ["pergunta com marcadores {endereco} e {horarios}", { ...base, answer: "O PROCON atende de {horarios} no endereço {endereco}." }],
]

const sampleSchedule: SchedulePlaceholdersSource = {
    unitAddress: "Av. Nove de Julho, 215 - Centro, Jacareí - SP",
    unitAddressComplement: "Sala 2",
    ranges: [1, 2, 3, 4, 5].map((weekday) => ({
        weekday,
        slotIndex: 1,
        startTime: "08:30",
        endTime: "16:30",
    })),
}

describe("prévia do Conteúdo igual ao que o bot envia", () => {
    it.each(cases)("%s: a prévia devolve as mesmas mensagens que o bot envia", async (_name, stored) => {
        const resposta = await new MotorDecisaoService(
            botRepository(stored),
            async () => sampleSchedule,
        ).processarPergunta(1)
        const preview = buildQuestionPreview(category, [], previewInputOf(stored), sampleSchedule)

        expect(preview.botMessages.officialMessages).toEqual(mensagensRespostaOficial(resposta))
        expect(preview.botMessages.aiMessage).toEqual(
            stored.llmAllowed && !stored.outOfScope ? montarMensagemIa(AI_SAMPLE_TEXT, resposta) : null,
        )
    })
})
