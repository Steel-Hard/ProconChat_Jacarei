import { describe, expect, it } from "vitest"
import {
    AVISO_NAO_VINCULANTE,
    OFERTA_AGENDAMENTO,
    PERGUNTA_RESOLVIDA,
} from "./messageFormatter.service"
import {
    AI_SAMPLE_LABEL,
    ANSWER_WARNING_MESSAGE,
    OUT_OF_SCOPE_NOTICE,
    buildQuestionPreview,
    enrichCategoryList,
    enrichQuestionList,
} from "./contentRules"
import { CategoryRecord, QuestionRecord } from "../types/content.types"

function makeCategory(overrides: Partial<CategoryRecord> & { id: number }): CategoryRecord {
    return {
        id: overrides.id,
        title: overrides.title ?? `Categoria ${overrides.id}`,
        shortTitle: overrides.shortTitle ?? `Cat ${overrides.id}`,
        description: overrides.description ?? null,
        active: overrides.active ?? true,
        position: overrides.position ?? overrides.id - 1,
        questionsCount: overrides.questionsCount ?? 3,
        activeQuestionsCount: overrides.activeQuestionsCount ?? 3,
        updatedBy: overrides.updatedBy ?? null,
        updatedAt: overrides.updatedAt ?? "2026-10-20T10:00:00.000Z",
    }
}

function makeQuestion(overrides: Partial<QuestionRecord> & { id: number }): QuestionRecord {
    return {
        id: overrides.id,
        categoryId: overrides.categoryId ?? 1,
        categoryTitle: overrides.categoryTitle ?? "Compras e Garantias",
        shortTitle: overrides.shortTitle ?? `Pergunta ${overrides.id}`,
        shortDescription: overrides.shortDescription ?? `Descrição ${overrides.id}`,
        question: overrides.question ?? `Texto da pergunta ${overrides.id}?`,
        answer: overrides.answer ?? `Resposta da pergunta ${overrides.id}.`,
        legalBasis: overrides.legalBasis ?? "Art. 18 do CDC",
        requiredDocuments: overrides.requiredDocuments ?? ["RG ou CNH"],
        requiresInPerson: overrides.requiresInPerson ?? false,
        inPersonNote: overrides.inPersonNote ?? null,
        outOfScope: overrides.outOfScope ?? false,
        llmAllowed: overrides.llmAllowed ?? true,
        active: overrides.active ?? true,
        position: overrides.position ?? overrides.id - 1,
        updatedBy: overrides.updatedBy ?? null,
        updatedAt: overrides.updatedAt ?? "2026-10-20T10:00:00.000Z",
    }
}

describe("contentRules", () => {
    describe("enrichCategoryList", () => {
        it("marks active categories with zero active questions as hiddenInChatbot and excludes them from WhatsApp pagination", () => {
            const categories: CategoryRecord[] = [
                makeCategory({ id: 1, active: true, activeQuestionsCount: 2 }),
                makeCategory({ id: 2, active: true, activeQuestionsCount: 0, questionsCount: 1 }),
                makeCategory({ id: 3, active: false, activeQuestionsCount: 4 }),
            ]

            const enriched = enrichCategoryList(categories)

            expect(enriched[0]?.hiddenInChatbot).toBe(false)
            expect(enriched[0]?.whatsappPage).toBe(1)
            expect(enriched[0]?.pageBreak).toBeNull()

            expect(enriched[1]?.hiddenInChatbot).toBe(true)
            expect(enriched[1]?.whatsappPage).toBeNull()
            expect(enriched[1]?.pageBreak).toBeNull()

            expect(enriched[2]?.hiddenInChatbot).toBe(false)
            expect(enriched[2]?.whatsappPage).toBeNull()
            expect(enriched[2]?.pageBreak).toBeNull()
        })

        it("places pageBreak on the 10th visible category when total visible categories > 10", () => {
            const categories: CategoryRecord[] = Array.from({ length: 12 }, (_, idx) =>
                makeCategory({ id: idx + 1, active: true, activeQuestionsCount: 1 }),
            )

            const enriched = enrichCategoryList(categories)

            expect(enriched[8]?.whatsappPage).toBe(1)
            expect(enriched[8]?.pageBreak).toBeNull()

            expect(enriched[9]?.whatsappPage).toBe(2)
            expect(enriched[9]?.pageBreak).toBe("Página 2 no WhatsApp")

            expect(enriched[11]?.whatsappPage).toBe(2)
            expect(enriched[11]?.pageBreak).toBeNull()
        })
    })

    describe("enrichQuestionList", () => {
        it("keeps all active questions on page 1 when total active is <= 10", () => {
            const questions = Array.from({ length: 10 }, (_, idx) =>
                makeQuestion({ id: idx + 1, active: true }),
            )

            const enriched = enrichQuestionList(questions)

            expect(enriched.every((q) => q.whatsappPage === 1 && q.pageBreak === null)).toBe(true)
        })

        it("adds 'Página 2 no WhatsApp' on the 10th active question and 'Página 3 no WhatsApp' on the 18th active question when total active > 18", () => {
            const questions: QuestionRecord[] = [
                ...Array.from({ length: 5 }, (_, idx) =>
                    makeQuestion({ id: idx + 1, active: true }),
                ),
                makeQuestion({ id: 99, active: false }),
                ...Array.from({ length: 15 }, (_, idx) =>
                    makeQuestion({ id: idx + 6, active: true }),
                ),
            ]

            const enriched = enrichQuestionList(questions)
            const inactive = enriched.find((q) => q.id === 99)
            expect(inactive?.whatsappPage).toBeNull()
            expect(inactive?.pageBreak).toBeNull()

            const activeItems = enriched.filter((q) => q.active)
            expect(activeItems).toHaveLength(20)
            expect(activeItems[8]?.whatsappPage).toBe(1)
            expect(activeItems[8]?.pageBreak).toBeNull()

            expect(activeItems[9]?.whatsappPage).toBe(2)
            expect(activeItems[9]?.pageBreak).toBe("Página 2 no WhatsApp")

            expect(activeItems[16]?.whatsappPage).toBe(2)
            expect(activeItems[16]?.pageBreak).toBeNull()

            expect(activeItems[17]?.whatsappPage).toBe(3)
            expect(activeItems[17]?.pageBreak).toBe("Página 3 no WhatsApp")
        })

        it("omits whatsappPage and pageBreak when isSearchResult is true and flags long answers >= 1000 chars", () => {
            const questions: QuestionRecord[] = [
                makeQuestion({ id: 1, answer: "Curta." }),
                makeQuestion({ id: 2, answer: "X".repeat(1000) }),
            ]

            const enriched = enrichQuestionList(questions, { isSearchResult: true })

            expect(enriched[0]?.whatsappPage).toBeNull()
            expect(enriched[0]?.answerLengthWarning).toBe(false)
            expect(enriched[0]?.answerLengthWarningMessage).toBeNull()

            expect(enriched[1]?.whatsappPage).toBeNull()
            expect(enriched[1]?.answerLengthWarning).toBe(true)
            expect(enriched[1]?.answerLengthWarningMessage).toBe(ANSWER_WARNING_MESSAGE)
        })
    })

    describe("buildQuestionPreview", () => {
        const category = makeCategory({
            id: 1,
            title: "Compras e Garantias",
            shortTitle: "Compras e garantia",
        })

        const existingQuestions = [
            makeQuestion({ id: 10, shortTitle: "Produto com defeito" }),
            makeQuestion({ id: 11, shortTitle: "Arrependimento 7 dias" }),
        ]

        it("builds preview for a standard question with AI sample and resolution step", () => {
            const preview = buildQuestionPreview(category, existingQuestions, {
                questionId: 10,
                categoryId: 1,
                shortTitle: "Defeito atualizado",
                shortDescription: "Prazo de 30 dias",
                question: "Comprei um produto com defeito, o que fazer?",
                answer: "O fornecedor tem até 30 dias para reparar.",
                legalBasis: "Art. 18 do CDC",
                requiredDocuments: ["Nota fiscal", "RG ou CNH"],
                requiresInPerson: false,
                inPersonNote: null,
                outOfScope: false,
                llmAllowed: true,
            })

            expect(preview.fixedDisclaimer).toBe(AVISO_NAO_VINCULANTE)
            expect(preview.categoryList.rows).toHaveLength(2)
            expect(preview.categoryList.rows[0]).toEqual({
                id: 10,
                shortTitle: "Defeito atualizado",
                shortDescription: "Prazo de 30 dias",
                isCurrent: true,
            })
            expect(preview.answerBubble.aiSampleLabel).toBe(AI_SAMPLE_LABEL)
            expect(preview.answerBubble.outOfScopeNotice).toBeNull()
            expect(preview.answerBubble.formattedText).toContain(AVISO_NAO_VINCULANTE)
            expect(preview.nextStepBubble).toEqual({
                type: "resolution",
                text: "A sua dúvida foi resolvida?",
                inPersonNote: null,
                prompt: "A sua dúvida foi resolvida?",
                buttons: ["Sim", "Não"],
                formattedText: PERGUNTA_RESOLVIDA,
            })
        })

        it("builds preview for a question that requires in-person attendance with schedule offer", () => {
            const preview = buildQuestionPreview(category, existingQuestions, {
                categoryId: 1,
                shortTitle: "Cobrança indevida",
                shortDescription: null,
                question: "Fui cobrado indevidamente.",
                answer: "Você tem direito à devolução em dobro.",
                legalBasis: "Art. 42 do CDC",
                requiredDocuments: ["Fatura"],
                requiresInPerson: true,
                inPersonNote: "Traga as 3 últimas faturas impressas.",
                outOfScope: false,
                llmAllowed: false,
            })

            expect(preview.categoryList.rows).toHaveLength(3)
            expect(preview.categoryList.rows[2]?.isCurrent).toBe(true)
            expect(preview.answerBubble.aiSampleLabel).toBeNull()
            expect(preview.nextStepBubble).toEqual({
                type: "schedule_offer",
                text: "Para este caso é necessário atendimento presencial no PROCON Jacareí.",
                inPersonNote: "Traga as 3 últimas faturas impressas.",
                prompt: "Deseja agendar um horário?",
                buttons: ["Agendar atendimento", "Agora não"],
                formattedText: OFERTA_AGENDAMENTO,
            })
        })

        it("builds preview for an out-of-scope question without nextStepBubble", () => {
            const preview = buildQuestionPreview(category, existingQuestions, {
                categoryId: 1,
                shortTitle: "Multa de trânsito",
                shortDescription: "Recursos ao órgão de trânsito",
                question: "Quero recorrer de uma multa de trânsito.",
                answer: "Multas de trânsito devem ser recorridas junto ao JARI/DETRAN.",
                legalBasis: null,
                requiredDocuments: [],
                requiresInPerson: false,
                inPersonNote: null,
                outOfScope: true,
                llmAllowed: false,
            })

            expect(preview.answerBubble.outOfScopeNotice).toBe(OUT_OF_SCOPE_NOTICE)
            expect(preview.answerBubble.aiSampleLabel).toBeNull()
            expect(preview.nextStepBubble).toBeNull()
        })
    })
})
