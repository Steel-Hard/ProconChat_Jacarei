import {
    AVISO_NAO_VINCULANTE,
    OFERTA_AGENDAMENTO,
    PERGUNTA_RESOLVIDA,
    criarMensagensPerguntas,
    mensagensRespostaOficial,
    montarMensagemIa,
    paginarItens,
    formatarRespostaFinal,
} from "./messageFormatter.service"
import type { OutgoingMessage } from "../types/message.types"
import type { Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import {
    CategoryItem,
    CategoryRecord,
    PreviewBotList,
    PreviewCategoryListRow,
    PreviewNextStepBubble,
    QuestionItem,
    QuestionPreviewInput,
    QuestionPreviewResult,
    QuestionRecord,
} from "../types/content.types"

export const ANSWER_WARNING_THRESHOLD = 1000
export const ANSWER_WARNING_MESSAGE = "Respostas longas ficam difíceis de ler no celular"

export const AI_SAMPLE_TEXT =
    "Exemplo ilustrativo de complemento redigido pela IA a partir da orientação oficial acima, sem alterar prazos, documentos nem fundamento legal."

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
): PreviewCategoryListRow[] {
    const currentRow = (questionId: number | null): PreviewCategoryListRow => ({
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

    const rows: PreviewCategoryListRow[] = []
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

function rowToPergunta(row: PreviewCategoryListRow, categoryId: number): Pergunta {
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
    rows: PreviewCategoryListRow[],
    categoryId: number,
): { botList: PreviewBotList; pageRows: PreviewCategoryListRow[]; hasMoreOptions: boolean } {
    const firstPage = paginarItens(rows, 1)
    let targetPage = firstPage
    for (let page = 1; page <= firstPage.totalPaginas; page++) {
        const pageResult = page === 1 ? firstPage : paginarItens(rows, page)
        if (pageResult.itensPagina.some((r: PreviewCategoryListRow) => r.isCurrent)) {
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
            currentRowIndex: targetPage.itensPagina.findIndex((r: PreviewCategoryListRow) => r.isCurrent),
            page: targetPage.paginaAtual,
            totalPages: targetPage.totalPaginas,
        },
        pageRows: [...targetPage.itensPagina],
        hasMoreOptions: targetPage.temProxima,
    }
}

function buildPreviewOfficialMessages(resposta: RespostaFinalOutput): OutgoingMessage[] {
    if (resposta.fora_de_escopo) {
        return [{ type: "text", text: formatarRespostaFinal(resposta) }]
    }
    return mensagensRespostaOficial(resposta)
}

function buildNextStepBubble(
    resposta: RespostaFinalOutput,
    officialMessages: OutgoingMessage[],
    inPersonNote: string | null,
): PreviewNextStepBubble | null {
    const step = officialMessages.find(
        (m): m is Extract<OutgoingMessage, { type: "buttons" }> => m.type === "buttons",
    )
    if (!step || resposta.fora_de_escopo) {
        return null
    }

    return {
        type: resposta.requer_presencial ? "schedule_offer" : "resolution",
        text: step.text,
        inPersonNote: resposta.requer_presencial ? inPersonNote : null,
        prompt: step.text,
        buttons: step.buttons.map((button) => button.title),
        formattedText: resposta.requer_presencial ? OFERTA_AGENDAMENTO : PERGUNTA_RESOLVIDA,
    }
}

export function buildQuestionPreview(
    category: CategoryRecord,
    existingQuestions: QuestionRecord[],
    input: QuestionPreviewInput,
): QuestionPreviewResult {
    const allActiveRows = buildPreviewRows(existingQuestions, input)
    const { botList, pageRows, hasMoreOptions } = buildBotCategoryList(allActiveRows, category.id)

    const resposta: RespostaFinalOutput = {
        categoria: category.title,
        pergunta: input.question,
        base_legal: input.legalBasis ?? "",
        resposta: input.answer,
        documentos_necessarios: input.requiredDocuments,
        requer_presencial: input.requiresInPerson,
        fora_de_escopo: input.outOfScope,
    }

    const officialMessages = buildPreviewOfficialMessages(resposta)
    const aiCandidate =
        input.llmAllowed && !input.outOfScope ? montarMensagemIa(AI_SAMPLE_TEXT, resposta) : null
    const aiMessage = aiCandidate?.type === "buttons" ? aiCandidate : null
    const officialText = officialMessages.find(
        (m): m is Extract<OutgoingMessage, { type: "text" }> => m.type === "text",
    )

    const answerLengthWarning = input.answer.length >= ANSWER_WARNING_THRESHOLD

    return {
        fixedDisclaimer: AVISO_NAO_VINCULANTE,
        answerLengthWarning,
        answerLengthWarningMessage: answerLengthWarning ? ANSWER_WARNING_MESSAGE : null,
        categoryList: {
            categoryTitle: category.title,
            categoryShortTitle: category.shortTitle,
            rows: pageRows,
            hasMoreOptions,
            totalActiveQuestions: allActiveRows.length,
        },
        answerBubble: {
            question: input.question,
            answer: input.answer,
            legalBasis: input.legalBasis,
            requiredDocuments: input.requiredDocuments,
            llmAllowed: input.llmAllowed,
            aiSampleLabel: aiMessage?.footer ?? null,
            aiSampleText: input.llmAllowed ? AI_SAMPLE_TEXT : null,
            outOfScopeNotice: null,
            disclaimer: AVISO_NAO_VINCULANTE,
            formattedText: officialText?.text ?? "",
        },
        nextStepBubble: buildNextStepBubble(resposta, officialMessages, input.inPersonNote),
        botMessages: {
            categoryList: botList,
            officialMessages,
            aiMessage,
        },
    }
}
