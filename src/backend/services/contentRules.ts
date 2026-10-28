import {
    AVISO_NAO_VINCULANTE,
    OFERTA_AGENDAMENTO,
    PERGUNTA_RESOLVIDA,
    formatarRespostaFinal,
    paginarItens,
} from "./messageFormatter.service"
import {
    CategoryItem,
    CategoryRecord,
    PreviewCategoryListRow,
    PreviewNextStepBubble,
    QuestionItem,
    QuestionPreviewInput,
    QuestionPreviewResult,
    QuestionRecord,
} from "../types/content.types"

export const ANSWER_WARNING_THRESHOLD = 1000
export const ANSWER_WARNING_MESSAGE = "Respostas longas ficam difíceis de ler no celular"

export const AI_SAMPLE_LABEL = "Gerado com auxílio de IA"
export const AI_SAMPLE_TEXT =
    "Exemplo ilustrativo de complemento redigido pela IA a partir da orientação oficial acima, sem alterar prazos, documentos nem fundamento legal."

export const OUT_OF_SCOPE_NOTICE =
    "Esta dúvida não faz parte do atendimento do PROCON Jacareí. Procure o órgão indicado acima."

export const IN_PERSON_HEADER =
    "Para este caso é necessário atendimento presencial no PROCON Jacareí."
export const IN_PERSON_PROMPT = "Deseja agendar um horário?"
export const RESOLUTION_PROMPT = "A sua dúvida foi resolvida?"

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

export function buildQuestionPreview(
    category: CategoryRecord,
    existingQuestions: QuestionRecord[],
    input: QuestionPreviewInput,
): QuestionPreviewResult {
    const currentRow: PreviewCategoryListRow = {
        id: input.questionId ?? null,
        shortTitle: input.shortTitle,
        shortDescription: input.shortDescription,
        isCurrent: true,
    }

    const allActiveRows: PreviewCategoryListRow[] = []
    let insertedCurrent = false

    for (const q of existingQuestions) {
        if (input.questionId !== undefined && q.id === input.questionId) {
            allActiveRows.push(currentRow)
            insertedCurrent = true
        } else if (q.active) {
            allActiveRows.push({
                id: q.id,
                shortTitle: q.shortTitle,
                shortDescription: q.shortDescription,
                isCurrent: false,
            })
        }
    }

    if (!insertedCurrent) {
        allActiveRows.push(currentRow)
    }

    const firstPage = paginarItens(allActiveRows, 1)
    const rows = [...firstPage.itensPagina]

    if (!rows.some((r: PreviewCategoryListRow) => r.isCurrent) && rows.length > 0) {
        rows[rows.length - 1] = currentRow
    }

    const formattedAnswerText = formatarRespostaFinal({
        categoria: category.title,
        pergunta: input.question,
        base_legal: input.legalBasis ?? "",
        resposta: input.answer,
        documentos_necessarios: input.requiredDocuments,
        requer_presencial: input.requiresInPerson,
        fora_de_escopo: input.outOfScope,
    })

    let nextStepBubble: PreviewNextStepBubble | null = null

    if (!input.outOfScope) {
        if (input.requiresInPerson) {
            nextStepBubble = {
                type: "schedule_offer",
                text: IN_PERSON_HEADER,
                inPersonNote: input.inPersonNote,
                prompt: IN_PERSON_PROMPT,
                buttons: ["Agendar atendimento", "Agora não"],
                formattedText: OFERTA_AGENDAMENTO,
            }
        } else {
            nextStepBubble = {
                type: "resolution",
                text: RESOLUTION_PROMPT,
                inPersonNote: null,
                prompt: RESOLUTION_PROMPT,
                buttons: ["Sim", "Não"],
                formattedText: PERGUNTA_RESOLVIDA,
            }
        }
    }

    const answerLengthWarning = input.answer.length >= ANSWER_WARNING_THRESHOLD

    return {
        fixedDisclaimer: AVISO_NAO_VINCULANTE,
        answerLengthWarning,
        answerLengthWarningMessage: answerLengthWarning ? ANSWER_WARNING_MESSAGE : null,
        categoryList: {
            categoryTitle: category.title,
            categoryShortTitle: category.shortTitle,
            rows,
            hasMoreOptions: firstPage.temProxima,
            totalActiveQuestions: allActiveRows.length,
        },
        answerBubble: {
            question: input.question,
            answer: input.answer,
            legalBasis: input.legalBasis,
            requiredDocuments: input.requiredDocuments,
            llmAllowed: input.llmAllowed,
            aiSampleLabel: input.llmAllowed ? AI_SAMPLE_LABEL : null,
            aiSampleText: input.llmAllowed ? AI_SAMPLE_TEXT : null,
            outOfScopeNotice: input.outOfScope ? OUT_OF_SCOPE_NOTICE : null,
            disclaimer: AVISO_NAO_VINCULANTE,
            formattedText: formattedAnswerText,
        },
        nextStepBubble,
    }
}
