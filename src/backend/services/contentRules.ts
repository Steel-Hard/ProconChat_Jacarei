import {
    LIMITE_CORPO_BOTOES,
    criarMensagensPerguntas,
    mensagensRespostaOficial,
    montarMensagemIa,
    paginarItens,
} from "./messageFormatter.service"
import type { OutgoingMessage } from "../types/message.types"
import type { Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import type { ScheduleRangeItem } from "../types/schedule.types"
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

export const NO_SCHEDULE_HOURS_MESSAGE = "sem horários de atendimento configurados"

const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

const WEEKDAY_FULL_NAMES: Record<number, string> = {
    0: "domingo",
    1: "segunda-feira",
    2: "terça-feira",
    3: "quarta-feira",
    4: "quinta-feira",
    5: "sexta-feira",
    6: "sábado",
}

const WEEKDAY_SHORT_NAMES: Record<number, string> = {
    0: "domingo",
    1: "segunda",
    2: "terça",
    3: "quarta",
    4: "quinta",
    5: "sexta",
    6: "sábado",
}

export interface SchedulePlaceholdersSource {
    unitAddress: string
    unitAddressComplement: string | null
    ranges: Pick<ScheduleRangeItem, "weekday" | "slotIndex" | "startTime" | "endTime">[]
}

export function hasAnswerPlaceholders(answer: string): boolean {
    return answer.includes("{endereco}") || answer.includes("{horarios}")
}

export function formatUnitAddressForAnswer(
    source: Pick<SchedulePlaceholdersSource, "unitAddress" | "unitAddressComplement">,
): string {
    const address = source.unitAddress.trim()
    const complement = source.unitAddressComplement?.trim()
    return complement ? `${address} (${complement})` : address
}

function formatDayRangesText(
    ranges: Pick<ScheduleRangeItem, "startTime" | "endTime" | "slotIndex">[],
): string {
    const ordered = [...ranges].sort(
        (a, b) => a.startTime.localeCompare(b.startTime) || a.slotIndex - b.slotIndex,
    )
    const parts = ordered.map(
        (range) => `das ${range.startTime.trim().slice(0, 5)} às ${range.endTime.trim().slice(0, 5)}`,
    )
    if (parts.length <= 1) {
        return parts[0] ?? ""
    }
    return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`
}

function formatDayGroupLabel(positions: number[]): string {
    const weekdays = positions.map((pos) => WEEKDAY_DISPLAY_ORDER[pos]!)
    if (weekdays.length === 1) {
        return WEEKDAY_FULL_NAMES[weekdays[0]!] ?? ""
    }
    const first = WEEKDAY_SHORT_NAMES[weekdays[0]!] ?? ""
    const last = WEEKDAY_SHORT_NAMES[weekdays[weekdays.length - 1]!] ?? ""
    return weekdays.length === 2 ? `${first} e ${last}` : `${first} a ${last}`
}

export function formatScheduleHoursForAnswer(
    ranges: Pick<ScheduleRangeItem, "weekday" | "slotIndex" | "startTime" | "endTime">[],
): string {
    const activeDays: Array<{ position: number; rangesText: string }> = []

    WEEKDAY_DISPLAY_ORDER.forEach((weekday, position) => {
        const dayRanges = ranges.filter((r) => r.weekday === weekday)
        if (dayRanges.length > 0) {
            activeDays.push({
                position,
                rangesText: formatDayRangesText(dayRanges),
            })
        }
    })

    if (activeDays.length === 0) {
        return NO_SCHEDULE_HOURS_MESSAGE
    }

    const groups: Array<{ positions: number[]; rangesText: string }> = []
    for (const day of activeDays) {
        const lastGroup = groups[groups.length - 1]
        const lastPosition = lastGroup?.positions[lastGroup.positions.length - 1]
        if (
            lastGroup &&
            lastPosition !== undefined &&
            day.position === lastPosition + 1 &&
            lastGroup.rangesText === day.rangesText
        ) {
            lastGroup.positions.push(day.position)
        } else {
            groups.push({ positions: [day.position], rangesText: day.rangesText })
        }
    }

    return groups
        .map((group) => `${formatDayGroupLabel(group.positions)}, ${group.rangesText}`)
        .join("; ")
}

export function resolveAnswerPlaceholders(
    answer: string,
    schedule: SchedulePlaceholdersSource | null | undefined,
): string {
    if (!schedule || !hasAnswerPlaceholders(answer)) {
        return answer
    }
    let resolved = answer
    if (resolved.includes("{endereco}")) {
        const formattedAddress = formatUnitAddressForAnswer(schedule)
        resolved = resolved.replace(/\{endereco\}/g, () => formattedAddress)
    }
    if (resolved.includes("{horarios}")) {
        const formattedHours = formatScheduleHoursForAnswer(schedule.ranges)
        resolved = resolved.replace(/\{horarios\}/g, () => formattedHours)
    }
    return resolved
}

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
    schedule: SchedulePlaceholdersSource | null = null,
): QuestionPreviewResult {
    const allActiveRows = buildPreviewRows(existingQuestions, input)
    const { botList } = buildBotCategoryList(allActiveRows, category.id)
    const resolvedAnswer = resolveAnswerPlaceholders(input.answer, schedule)

    const resposta: RespostaFinalOutput = {
        categoria: category.title,
        pergunta: input.question,
        base_legal: input.legalBasis ?? "",
        resposta: resolvedAnswer,
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
    const answerLengthWarning = resolvedAnswer.length >= ANSWER_WARNING_THRESHOLD

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
