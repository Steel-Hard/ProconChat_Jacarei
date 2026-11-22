import { describe, expect, it } from "vitest"
import {
    AVISO_NAO_VINCULANTE,
    LIMITE_CORPO_BOTOES,
    ROTULO_IA,
    criarMensagensPerguntas,
    mensagensRespostaOficial,
    montarMensagemIa,
} from "./messageFormatter.service"
import {
    AI_SAMPLE_TEXT,
    ANSWER_WARNING_MESSAGE,
    buildQuestionPreview,
    enrichCategoryList,
    enrichQuestionList,
    formatScheduleHoursForAnswer,
    formatUnitAddressForAnswer,
    resolveAnswerPlaceholders,
    SchedulePlaceholdersSource,
} from "./contentRules"
import type { Pergunta } from "../types/motorDecisao.types"
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

            const { categoryList, officialMessages, aiMessage } = preview.botMessages
            expect(categoryList.message.rows).toHaveLength(2)
            expect(categoryList.message.rows[0]).toMatchObject({
                title: "Defeito atualizado",
                description: "Prazo de 30 dias",
            })
            expect(categoryList.currentRowIndex).toBe(0)
            expect(aiMessage?.footer).toBe(ROTULO_IA)
            expect(officialMessages[0]).toMatchObject({ type: "text" })
            expect(officialMessages[0]?.type === "text" && officialMessages[0].text).toContain(AVISO_NAO_VINCULANTE)
            expect(officialMessages[1]).toEqual({
                type: "buttons",
                text: "A dúvida foi resolvida?",
                buttons: [
                    { id: "resolved_yes", title: "Sim" },
                    { id: "resolved_no", title: "Não" },
                ],
            })
        })

        it("returns only botMessages and the answer length warning", () => {
            const preview = buildQuestionPreview(category, existingQuestions, {
                questionId: 10,
                categoryId: 1,
                shortTitle: "Defeito atualizado",
                shortDescription: null,
                question: "Comprei um produto com defeito, o que fazer?",
                answer: "a".repeat(1000),
                legalBasis: null,
                requiredDocuments: [],
                requiresInPerson: false,
                inPersonNote: null,
                outOfScope: false,
                llmAllowed: true,
            })

            expect(Object.keys(preview).sort()).toEqual(["answerLengthWarning", "answerLengthWarningMessage", "botMessages"])
            expect(preview.answerLengthWarning).toBe(true)
            expect(preview.answerLengthWarningMessage).toBe(ANSWER_WARNING_MESSAGE)
            expect(Object.keys(preview.botMessages).sort()).toEqual([
                "aiLengthWarning",
                "aiMessage",
                "categoryList",
                "officialMessages",
            ])
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

            const { categoryList, officialMessages, aiMessage } = preview.botMessages
            expect(categoryList.message.rows).toHaveLength(3)
            expect(categoryList.currentRowIndex).toBe(2)
            expect(aiMessage).toBeNull()
            expect(officialMessages[1]).toEqual({
                type: "buttons",
                text: "Deseja agendar um atendimento presencial no PROCON Jacareí?",
                buttons: [
                    { id: "schedule_yes", title: "Agendar presencial" },
                    { id: "schedule_no", title: "Agora não" },
                ],
            })
        })

        it("builds preview for an out-of-scope question with two text messages and no buttons", () => {
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

            const { officialMessages, aiMessage } = preview.botMessages
            expect(aiMessage).toBeNull()
            expect(officialMessages).toHaveLength(2)
            expect(officialMessages.every((message) => message.type === "text")).toBe(true)
        })

        it("displays the WhatsApp page where the edited question actually falls when category has > 10 questions", () => {
            const manyQuestions = Array.from({ length: 11 }, (_, idx) =>
                makeQuestion({ id: 100 + idx, shortTitle: `Pergunta ${idx + 1}` }),
            )
            const preview = buildQuestionPreview(category, manyQuestions, {
                questionId: 109,
                categoryId: 1,
                shortTitle: "Décima pergunta",
                shortDescription: null,
                question: "Pergunta na página 2?",
                answer: "Resposta na página 2.",
                legalBasis: null,
                requiredDocuments: [],
                requiresInPerson: false,
                inPersonNote: null,
                outOfScope: false,
                llmAllowed: false,
            })

            const { categoryList } = preview.botMessages
            expect(categoryList.message.rows).toHaveLength(3)
            expect(categoryList.message.rows[0]).toMatchObject({ title: "Décima pergunta" })
            expect(categoryList.currentRowIndex).toBe(0)
            expect(categoryList.page).toBe(2)
            expect(categoryList.totalPages).toBe(2)
            expect(categoryList.message.rows.at(-1)?.title).toBe("Voltar opções")
        })
    })
    describe("buildQuestionPreview botMessages", () => {
        const category = makeCategory({ id: 1, title: "Compras e Garantias", shortTitle: "Compras e garantia" })

        const baseInput = {
            categoryId: 1,
            shortTitle: "Defeito",
            shortDescription: "Prazo de 30 dias",
            question: "Comprei um produto com defeito, o que fazer?",
            answer: "O fornecedor tem até 30 dias para reparar.",
            legalBasis: "Art. 18 do CDC",
            requiredDocuments: ["Nota fiscal", "RG ou CNH"],
            requiresInPerson: false,
            inPersonNote: null as string | null,
            outOfScope: false,
            llmAllowed: false,
        }

        function respostaDe(input: typeof baseInput) {
            return {
                categoria: category.title,
                pergunta: input.question,
                base_legal: input.legalBasis ?? "",
                resposta: input.answer,
                documentos_necessarios: input.requiredDocuments,
                requer_presencial: input.requiresInPerson,
                fora_de_escopo: input.outOfScope,
                ...(input.requiresInPerson && input.inPersonNote
                    ? { observacao_presencial: input.inPersonNote }
                    : {}),
            }
        }

        function manyQuestions(total: number) {
            return Array.from({ length: total }, (_, idx) =>
                makeQuestion({ id: 100 + idx, shortTitle: `Pergunta ${idx + 1}` }),
            )
        }

        function perguntaDeLinha(id: number, shortTitle: string, shortDescription: string | null): Pergunta {
            return {
                id,
                category_id: 1,
                question: "texto",
                short_title: shortTitle,
                short_description: shortDescription,
                legal_basis: null,
                answer: "resposta",
                requires_in_person: false,
                out_of_scope: false,
                llm_allowed: false,
                active: true,
            }
        }

        it("returns in officialMessages the same messages the bot sends for a common question", () => {
            const preview = buildQuestionPreview(category, [], baseInput)

            expect(preview.botMessages.officialMessages).toEqual(mensagensRespostaOficial(respostaDe(baseInput)))
            expect(preview.botMessages.aiMessage).toBeNull()
        })

        it("returns in officialMessages the same messages the bot sends for an in-person question", () => {
            const input = { ...baseInput, requiresInPerson: true, inPersonNote: "Traga as faturas." }
            const preview = buildQuestionPreview(category, [], input)

            expect(preview.botMessages.officialMessages).toEqual(mensagensRespostaOficial(respostaDe(input)))
        })

        it("shows the in-person note in the official and AI messages and not in the offer", () => {
            const input = { ...baseInput, llmAllowed: true, requiresInPerson: true, inPersonNote: "Traga as faturas." }
            const preview = buildQuestionPreview(category, [], input)
            const [oficial, oferta] = preview.botMessages.officialMessages

            expect(oficial?.type === "text" && oficial.text).toContain("Sobre o atendimento presencial: Traga as faturas.")
            expect(preview.botMessages.aiMessage?.text).toContain("Sobre o atendimento presencial: Traga as faturas.")
            expect(oferta?.type === "buttons" && oferta.text).not.toContain("Traga as faturas.")
        })

        it("returns the AI message built by the bot formatter with the sample text when AI is allowed", () => {
            const input = { ...baseInput, llmAllowed: true }
            const preview = buildQuestionPreview(category, [], input)

            expect(preview.botMessages.aiMessage).toEqual(montarMensagemIa(AI_SAMPLE_TEXT, respostaDe(input)))
            expect(preview.botMessages.officialMessages).toEqual(mensagensRespostaOficial(respostaDe(input)))
        })

        it("returns the AI message with the schedule offer for in-person questions", () => {
            const input = { ...baseInput, llmAllowed: true, requiresInPerson: true }
            const preview = buildQuestionPreview(category, [], input)

            expect(preview.botMessages.aiMessage).toEqual(montarMensagemIa(AI_SAMPLE_TEXT, respostaDe(input)))
        })

        it("returns the official text and the separate referral text and no AI message for out-of-scope questions", () => {
            const input = { ...baseInput, outOfScope: true, requiredDocuments: [] }
            const preview = buildQuestionPreview(category, [], input)

            expect(preview.botMessages.aiMessage).toBeNull()
            expect(preview.botMessages.officialMessages).toEqual(mensagensRespostaOficial(respostaDe(input)))
            expect(preview.botMessages.officialMessages).toHaveLength(2)
        })

        it("builds the list of the first page for a category with 11 questions", () => {
            const questions = manyQuestions(11)
            const preview = buildQuestionPreview(category, questions, { ...baseInput, questionId: 100 })
            const lista = preview.botMessages.categoryList

            const linhas = [
                perguntaDeLinha(100, "Defeito", "Prazo de 30 dias"),
                ...questions.slice(1).map((q) => perguntaDeLinha(q.id, q.shortTitle, q.shortDescription)),
            ]
            expect(lista.message).toEqual(criarMensagensPerguntas(linhas, 1)[0])
            expect(lista.currentRowIndex).toBe(0)
            expect(lista.page).toBe(1)
            expect(lista.totalPages).toBe(2)
            expect(lista.message.rows.at(-1)?.title).toBe("Ver mais opções")
        })

        it("builds the list of the last page when the current question is there", () => {
            const questions = manyQuestions(11)
            const preview = buildQuestionPreview(category, questions, { ...baseInput, questionId: 109 })
            const lista = preview.botMessages.categoryList

            const linhas = questions.map((q) =>
                q.id === 109 ? perguntaDeLinha(109, "Defeito", "Prazo de 30 dias") : perguntaDeLinha(q.id, q.shortTitle, q.shortDescription),
            )
            expect(lista.message).toEqual(criarMensagensPerguntas(linhas, 2)[0])
            expect(lista.currentRowIndex).toBe(0)
            expect(lista.page).toBe(2)
            expect(lista.totalPages).toBe(2)
            expect(lista.message.rows.at(-1)?.title).toBe("Voltar opções")
        })

        it("builds the list of a middle page with both navigation rows", () => {
            const questions = manyQuestions(19)
            const preview = buildQuestionPreview(category, questions, { ...baseInput, questionId: 112 })
            const lista = preview.botMessages.categoryList

            const linhas = questions.map((q) =>
                q.id === 112 ? perguntaDeLinha(112, "Defeito", "Prazo de 30 dias") : perguntaDeLinha(q.id, q.shortTitle, q.shortDescription),
            )
            expect(lista.message).toEqual(criarMensagensPerguntas(linhas, 2)[0])
            expect(lista.currentRowIndex).toBe(3)
            expect(lista.page).toBe(2)
            expect(lista.totalPages).toBe(3)
            expect(lista.message.rows.slice(-2).map((r) => r.title)).toEqual(["Voltar opções", "Ver mais opções"])
        })

        it.each([
            { total: 18, currentId: 100, page: 1, totalPages: 2, currentIndex: 0 },
            { total: 18, currentId: 109, page: 2, totalPages: 2, currentIndex: 0 },
            { total: 18, currentId: 117, page: 2, totalPages: 2, currentIndex: 8 },
            { total: 19, currentId: 100, page: 1, totalPages: 3, currentIndex: 0 },
            { total: 19, currentId: 116, page: 2, totalPages: 3, currentIndex: 7 },
            { total: 19, currentId: 117, page: 3, totalPages: 3, currentIndex: 0 },
            { total: 19, currentId: 118, page: 3, totalPages: 3, currentIndex: 1 },
        ])(
            "puts the current question on page $page of $totalPages with $total questions",
            ({ total, currentId, page, totalPages, currentIndex }) => {
                const questions = manyQuestions(total)
                const preview = buildQuestionPreview(category, questions, { ...baseInput, questionId: currentId })
                const lista = preview.botMessages.categoryList

                const linhas = questions.map((q) =>
                    q.id === currentId
                        ? perguntaDeLinha(q.id, "Defeito", "Prazo de 30 dias")
                        : perguntaDeLinha(q.id, q.shortTitle, q.shortDescription),
                )
                expect(lista.message).toEqual(criarMensagensPerguntas(linhas, page)[0])
                expect(lista.page).toBe(page)
                expect(lista.totalPages).toBe(totalPages)
                expect(lista.message.rows[lista.currentRowIndex]?.title).toBe("Defeito")
                expect(lista.currentRowIndex).toBe(currentIndex)
            },
        )

        describe("aiLengthWarning", () => {
            function inputComCorpoIaDe(tamanho: number, overrides: Partial<typeof baseInput> = {}) {
                const input = { ...baseInput, llmAllowed: true, legalBasis: "", ...overrides }
                const semPreenchimento = Array.from(
                    (montarMensagemIa(AI_SAMPLE_TEXT, respostaDe(input)) as { text: string }).text,
                ).length
                const preenchimento = tamanho - semPreenchimento - Array.from("\nBase legal: ").length
                return { ...input, legalBasis: "a".repeat(preenchimento) }
            }

            it("does not warn when the AI balloon body has exactly the limit", () => {
                const preview = buildQuestionPreview(category, [], inputComCorpoIaDe(LIMITE_CORPO_BOTOES))
                const aiMessage = preview.botMessages.aiMessage

                expect(Array.from(aiMessage?.text ?? "").length).toBe(LIMITE_CORPO_BOTOES)
                expect(preview.botMessages.aiLengthWarning).toEqual({
                    exceedsLimit: false,
                    length: LIMITE_CORPO_BOTOES,
                    limit: LIMITE_CORPO_BOTOES,
                    message: null,
                })
            })

            it("warns, with the same limit the bot uses, when the AI balloon body passes the limit by one character", () => {
                const preview = buildQuestionPreview(category, [], inputComCorpoIaDe(LIMITE_CORPO_BOTOES + 1))
                const warning = preview.botMessages.aiLengthWarning

                expect(Array.from(preview.botMessages.aiMessage?.text ?? "").length).toBe(LIMITE_CORPO_BOTOES + 1)
                expect(warning.exceedsLimit).toBe(true)
                expect(warning.length).toBe(LIMITE_CORPO_BOTOES + 1)
                expect(warning.limit).toBe(1024)
                expect(warning.message).toBe(
                    "Com o complemento por IA, esta mensagem passaria de 1.024 caracteres. Neste caso o bot envia só a resposta oficial.",
                )
                expect(preview.botMessages.aiMessage).not.toBeNull()
            })

            it("counts characters like the bot does, not UTF-16 units", () => {
                const input = inputComCorpoIaDe(LIMITE_CORPO_BOTOES, { legalBasis: "" })
                const comEmoji = { ...input, legalBasis: input.legalBasis.slice(0, -1) + "😀" }
                const preview = buildQuestionPreview(category, [], comEmoji)

                expect(preview.botMessages.aiLengthWarning.length).toBe(LIMITE_CORPO_BOTOES)
                expect(preview.botMessages.aiLengthWarning.exceedsLimit).toBe(false)
            })

            it("does not warn when AI is off or the question is out of scope", () => {
                const off = buildQuestionPreview(category, [], { ...inputComCorpoIaDe(2000), llmAllowed: false })
                const outOfScope = buildQuestionPreview(category, [], { ...inputComCorpoIaDe(2000), outOfScope: true })
                const semAviso = { exceedsLimit: false, length: 0, limit: LIMITE_CORPO_BOTOES, message: null }

                expect(off.botMessages.aiLengthWarning).toEqual(semAviso)
                expect(outOfScope.botMessages.aiLengthWarning).toEqual(semAviso)
            })
        })

        it("appends a new question to the end of the list when it has no id", () => {
            const questions = manyQuestions(2)
            const preview = buildQuestionPreview(category, questions, baseInput)
            const lista = preview.botMessages.categoryList

            expect(lista.currentRowIndex).toBe(2)
            expect(lista.message.rows[2]?.title).toBe("Defeito")
            expect(lista.message.rows[2]?.description).toBe("Prazo de 30 dias")
        })

        it("follows the order of listRows when it is sent and uses the form titles in the current row", () => {
            const questions = manyQuestions(3)
            const preview = buildQuestionPreview(category, questions, {
                ...baseInput,
                questionId: 101,
                listRows: [
                    { questionId: 102, shortTitle: "Terceira", shortDescription: null, isCurrent: false },
                    { questionId: 101, shortTitle: "Editada", shortDescription: "Nova descrição", isCurrent: true },
                    { questionId: 100, shortTitle: "Primeira", shortDescription: null, isCurrent: false },
                ],
            })
            const lista = preview.botMessages.categoryList

            expect(lista.message.rows.map((r) => r.title)).toEqual(["Terceira", "Defeito", "Primeira"])
            expect(lista.currentRowIndex).toBe(1)
            expect(lista.message.rows[1]?.description).toBe("Prazo de 30 dias")
        })

        describe("marcadores {endereco} e {horarios} (#78)", () => {
            const sampleSchedule: SchedulePlaceholdersSource = {
                unitAddress: "Av. Nove de Julho, 215 - Centro, Jacareí - SP",
                unitAddressComplement: "Sala 2",
                ranges: [1, 2, 3, 4, 5].flatMap((weekday) => [
                    { weekday, slotIndex: 1, startTime: "08:30", endTime: "11:30" },
                    { weekday, slotIndex: 2, startTime: "13:30", endTime: "16:30" },
                ]),
            }

            it("formata o endereço com e sem complemento", () => {
                expect(formatUnitAddressForAnswer(sampleSchedule)).toBe(
                    "Av. Nove de Julho, 215 - Centro, Jacareí - SP (Sala 2)",
                )
                expect(
                    formatUnitAddressForAnswer({
                        unitAddress: "  Rua Barão de Jacareí, 100  ",
                        unitAddressComplement: "   ",
                    }),
                ).toBe("Rua Barão de Jacareí, 100")
            })

            it("agrupa dias consecutivos com mesma grade e separa dias com horários distintos", () => {
                expect(formatScheduleHoursForAnswer(sampleSchedule.ranges)).toBe(
                    "segunda a sexta, das 08:30 às 11:30 e das 13:30 às 16:30",
                )

                expect(
                    formatScheduleHoursForAnswer([
                        { weekday: 1, slotIndex: 1, startTime: "08:00", endTime: "12:00" },
                        { weekday: 2, slotIndex: 1, startTime: "08:00", endTime: "12:00" },
                        { weekday: 4, slotIndex: 1, startTime: "09:00", endTime: "11:00" },
                        { weekday: 4, slotIndex: 2, startTime: "13:00", endTime: "15:00" },
                        { weekday: 4, slotIndex: 3, startTime: "15:30", endTime: "17:00" },
                        { weekday: 6, slotIndex: 1, startTime: "08:00", endTime: "12:00" },
                    ]),
                ).toBe(
                    "segunda e terça, das 08:00 às 12:00; quinta-feira, das 09:00 às 11:00, das 13:00 às 15:00 e das 15:30 às 17:00; sábado, das 08:00 às 12:00",
                )

                expect(formatScheduleHoursForAnswer([])).toBe(
                    "sem horários de atendimento configurados",
                )
            })

            it("troca os marcadores pelos textos de agenda não configurada na função pura", () => {
                expect(
                    resolveAnswerPlaceholders("Atendemos de {horarios}, em {endereco}.", null),
                ).toBe(
                    "Atendemos de sem horários de atendimento configurados, em endereço não configurado.",
                )
            })

            it("troca os marcadores pelos textos de agenda não configurada na prévia", () => {
                const preview = buildQuestionPreview(
                    category,
                    [],
                    { ...baseInput, answer: "Atendemos de {horarios}, em {endereco}." },
                    null,
                )
                const text = preview.botMessages.officialMessages[0]?.text ?? ""
                expect(text).toContain(
                    "Resposta: Atendemos de sem horários de atendimento configurados, em endereço não configurado.",
                )
                expect(text).not.toContain("{")
            })

            it("substitui {endereco} e {horarios} na prévia da resposta", () => {
                const preview = buildQuestionPreview(
                    category,
                    [],
                    {
                        ...baseInput,
                        answer: "Atendemos de {horarios}, em {endereco}.",
                    },
                    sampleSchedule,
                )

                const expectedAnswer =
                    "Atendemos de segunda a sexta, das 08:30 às 11:30 e das 13:30 às 16:30, em Av. Nove de Julho, 215 - Centro, Jacareí - SP (Sala 2)."
                expect(preview.botMessages.officialMessages[0]?.text).toContain(
                    `Resposta: ${expectedAnswer}`,
                )
                expect(
                    resolveAnswerPlaceholders("Texto sem marcadores.", sampleSchedule),
                ).toBe("Texto sem marcadores.")
            })
        })
    })
})
