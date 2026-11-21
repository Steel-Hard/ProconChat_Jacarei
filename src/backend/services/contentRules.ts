import {
    LIMITE_CORPO_BOTOES,
    criarMensagensPerguntas,
    mensagensRespostaOficial,
    montarMensagemIa,
    paginarItens,
} from "./messageFormatter.service"
import type { OutgoingMessage } from "../types/message.types"
import type { Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import {
    CategoryItem,
    CategoryRecord,
    PreviewAiLengthWarning,
    PreviewBotList,
    QuestionItem,
    QuestionPreviewInput,
    QuestionPreviewResult,
    QuestionRecord,
} from "../types/content.types"

export const ANSWER_WARNING_THRESHOLD = 1000
export const ANSWER_WARNING_MESSAGE = "Respostas longas ficam difíceis de ler no celular"

export const AI_LENGTH_WARNING_MESSAGE =
    "Com o complemento por IA, esta mensagem passaria de 1.024 caracteres. Neste caso o bot envia só a resposta oficial."

export const AI_SAMPLE_TEXT =
    "Exemplo ilustrativo de complemento redigido pela IA a partir da orientação oficial acima, sem alterar prazos, documentos nem fundamento legal."

interface PreviewRow {
    id: number | null
    shortTitle: string
    shortDescription: string | null
    isCurrent: boolean
}

interface WhatsappPagePlacement {
    whatsappPage: number
    pageBreak: string | null
}

export function buildWhatsappPageMap<T>(
    items: T[],
    isVisible: (item: T) => boolean,
): Map<T, WhatsappPagePlacement> {
    const visibleItems = items.filter(isVisible)
    const placementMap = new Map<T, WhatsappPagePlacement>()

    if (visibleItems.length === 0) {
        return placementMap
    }

    const firstPage = paginarItens(visibleItems, 1)
    const totalPages = firstPage.totalPaginas

    for (let page = 1; page <= totalPages; page++) {
        const pageResult = page === 1 ? firstPage : paginarItens(visibleItems, page)
        pageResult.itensPagina.forEach((item: T, indexInPage: number) => {
            placementMap.set(item, {
                whatsappPage: page,
                pageBreak: page > 1 && indexInPage === 0 ? `Página ${page} no WhatsApp` : null,
            })
        })
    }

    return placementMap
}

export function enrichCategoryItem(
    category: CategoryRecord,
    whatsappPage: number | null = null,
    pageBreak: string | null = null,
): CategoryItem {
    return {
        ...category,
        hiddenInChatbot: category.active && category.activeQuestionsCount === 0,
        whatsappPage,
        pageBreak,
    }
}

export function enrichCategoryList(categories: CategoryRecord[]): CategoryItem[] {
    const pageMap = buildWhatsappPageMap(
        categories,
        (cat: CategoryRecord) => cat.active && cat.activeQuestionsCount > 0,
    )

    return categories.map((cat: CategoryRecord) => {
        const placement = pageMap.get(cat)
        return enrichCategoryItem(
            cat,
            placement?.whatsappPage ?? null,
            placement?.pageBreak ?? null,
        )
    })
}

export function enrichQuestionItem(
    question: QuestionRecord,
    whatsappPage: number | null = null,
    pageBreak: string | null = null,
): QuestionItem {
    const answerLengthWarning = question.answer.length >= ANSWER_WARNING_THRESHOLD
    return {
        ...question,
        whatsappPage,
        pageBreak,
        answerLengthWarning,
        answerLengthWarningMessage: answerLengthWarning ? ANSWER_WARNING_MESSAGE : null,
    }
}

export function enrichQuestionList(
    questions: QuestionRecord[],
    options: { isSearchResult?: boolean } = {},
): QuestionItem[] {
    if (options.isSearchResult) {
        return questions.map((q: QuestionRecord) => enrichQuestionItem(q, null, null))
    }

    const pageMap = buildWhatsappPageMap(questions, (q: QuestionRecord) => q.active)

    return questions.map((q: QuestionRecord) => {
        const placement = pageMap.get(q)
        return enrichQuestionItem(
            q,
            placement?.whatsappPage ?? null,
            placement?.pageBreak ?? null,
        )
    })
}

function buildPreviewRows(
    existingQuestions: QuestionRecord[],
    input: QuestionPreviewInput,
): PreviewRow[] {
    const currentRow = (questionId: number | null): PreviewRow => ({
        id: questionId,
        shortTitle: input.shortTitle,
        shortDescription: input.shortDescription,
        isCurrent: true,
    })

    if (input.listRows !== undefined) {
        return input.listRows.map((row) =>
            row.isCurrent
                ? currentRow(input.questionId ?? row.questionId)
                : {
                      id: row.questionId,
                      shortTitle: row.shortTitle,
                      shortDescription: row.shortDescription,
                      isCurrent: false,
                  },
        )
    }

    const rows: PreviewRow[] = []
    let insertedCurrent = false

    for (const q of existingQuestions) {
        if (input.questionId !== undefined && q.id === input.questionId) {
            rows.push(currentRow(input.questionId))
            insertedCurrent = true
        } else if (q.active) {
            rows.push({
                id: q.id,
                shortTitle: q.shortTitle,
                shortDescription: q.shortDescription,
                isCurrent: false,
            })
        }
    }

    if (!insertedCurrent) {
        rows.push(currentRow(input.questionId ?? null))
    }

    return rows
}

function rowToPergunta(row: PreviewRow, categoryId: number): Pergunta {
    return {
        id: row.id ?? 0,
        category_id: categoryId,
        question: row.shortTitle,
        short_title: row.shortTitle,
        short_description: row.shortDescription,
        legal_basis: null,
        answer: "",
        requires_in_person: false,
        out_of_scope: false,
        llm_allowed: false,
        active: true,
    }
}

function buildBotCategoryList(
    rows: PreviewRow[],
    categoryId: number,
): { botList: PreviewBotList } {
    const firstPage = paginarItens(rows, 1)
    let targetPage = firstPage
    for (let page = 1; page <= firstPage.totalPaginas; page++) {
        const pageResult = page === 1 ? firstPage : paginarItens(rows, page)
        if (pageResult.itensPagina.some((r: PreviewRow) => r.isCurrent)) {
            targetPage = pageResult
            break
        }
    }

    const messages = criarMensagensPerguntas(
        rows.map((row) => rowToPergunta(row, categoryId)),
        targetPage.paginaAtual,
    )
    const message = messages.find(
        (m): m is Extract<OutgoingMessage, { type: "list" }> => m.type === "list",
    )
    if (!message) {
        throw new Error("Lista de perguntas da prévia não gerada")
    }

    return {
        botList: {
            message,
            currentRowIndex: targetPage.itensPagina.findIndex((r: PreviewRow) => r.isCurrent),
            page: targetPage.paginaAtual,
            totalPages: targetPage.totalPaginas,
        },
    }
}

function buildAiLengthWarning(
    aiMessage: Extract<OutgoingMessage, { type: "buttons" }> | null,
): PreviewAiLengthWarning {
    const length = aiMessage ? Array.from(aiMessage.text).length : 0
    const exceedsLimit = length > LIMITE_CORPO_BOTOES
    return {
        exceedsLimit,
        length,
        limit: LIMITE_CORPO_BOTOES,
        message: exceedsLimit ? AI_LENGTH_WARNING_MESSAGE : null,
    }
}

export function buildQuestionPreview(
    category: CategoryRecord,
    existingQuestions: QuestionRecord[],
    input: QuestionPreviewInput,
): QuestionPreviewResult {
    const allActiveRows = buildPreviewRows(existingQuestions, input)
    const { botList } = buildBotCategoryList(allActiveRows, category.id)

    const resposta: RespostaFinalOutput = {
        categoria: category.title,
        pergunta: input.question,
        base_legal: input.legalBasis ?? "",
        resposta: input.answer,
        documentos_necessarios: input.requiredDocuments,
        requer_presencial: input.requiresInPerson,
        fora_de_escopo: input.outOfScope,
        ...(input.requiresInPerson && input.inPersonNote?.trim()
            ? { observacao_presencial: input.inPersonNote.trim() }
            : {}),
    }

    const officialMessages = mensagensRespostaOficial(resposta)
    const aiCandidate =
        input.llmAllowed && !input.outOfScope ? montarMensagemIa(AI_SAMPLE_TEXT, resposta) : null
    const aiMessage = aiCandidate?.type === "buttons" ? aiCandidate : null
    const answerLengthWarning = input.answer.length >= ANSWER_WARNING_THRESHOLD

    return {
        answerLengthWarning,
        answerLengthWarningMessage: answerLengthWarning ? ANSWER_WARNING_MESSAGE : null,
        botMessages: {
            categoryList: botList,
            officialMessages,
            aiMessage,
            aiLengthWarning: buildAiLengthWarning(aiMessage),
        },
    }
}
