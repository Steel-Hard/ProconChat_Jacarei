import { describe, expect, it } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import { validateSchema } from "../middleware/validateRequest.middleware"
import {
    categoryActiveBodySchema,
    categoryCreateBodySchema,
    categoryReorderBodySchema,
    categoryUpdateBodySchema,
    contentIdParamSchema,
    questionActiveBodySchema,
    questionCreateBodySchema,
    questionListQuerySchema,
    questionPreviewBodySchema,
    questionReorderBodySchema,
    questionUpdateBodySchema,
} from "./content.schema"

describe("content.schema", () => {
    describe("contentIdParamSchema", () => {
        it("accepts a positive integer string and converts to number", () => {
            const parsed = validateSchema(
                contentIdParamSchema,
                { id: "42" },
                { withIssues: true },
            )
            expect(parsed).toEqual({ id: 42 })
        })

        it("rejects zero, negative, non-numeric, and unsafe integer strings", () => {
            for (const invalid of ["0", "-1", "abc", "999999999999999999999"]) {
                expect(() =>
                    validateSchema(contentIdParamSchema, { id: invalid }, { withIssues: true }),
                ).toThrow(BadRequestError)
            }
        })
    })

    describe("categoryCreateBodySchema and categoryUpdateBodySchema", () => {
        it("trims fields and normalizes empty description to null", () => {
            const parsed = validateSchema(
                categoryCreateBodySchema,
                {
                    title: "  Compras e Garantias  ",
                    shortTitle: "  Compras e garantia  ",
                    description: "   ",
                },
                { withIssues: true },
            )

            expect(parsed).toEqual({
                title: "Compras e Garantias",
                shortTitle: "Compras e garantia",
                description: null,
            })
        })

        it("rejects empty title or title over 150 characters", () => {
            expect(() =>
                validateSchema(
                    categoryCreateBodySchema,
                    { title: "   ", shortTitle: "Compras" },
                    { withIssues: true },
                ),
            ).toThrow(/Nome completo da categoria obrigatório/)

            expect(() =>
                validateSchema(
                    categoryCreateBodySchema,
                    { title: "A".repeat(151), shortTitle: "Compras" },
                    { withIssues: true },
                ),
            ).toThrow(/Nome completo da categoria deve ter no máximo 150 caracteres/)
        })

        it("rejects shortTitle over 24 characters or containing line breaks", () => {
            expect(() =>
                validateSchema(
                    categoryCreateBodySchema,
                    { title: "Compras", shortTitle: "A".repeat(25) },
                    { withIssues: true },
                ),
            ).toThrow(/Título curto da categoria deve ter entre 1 e 24 caracteres/)

            expect(() =>
                validateSchema(
                    categoryCreateBodySchema,
                    { title: "Compras", shortTitle: "Compras\nGarantia" },
                    { withIssues: true },
                ),
            ).toThrow(/Título curto da categoria não pode conter quebras de linha/)

            expect(() =>
                validateSchema(
                    categoryCreateBodySchema,
                    { title: "Compras\nGarantia", shortTitle: "Compras" },
                    { withIssues: true },
                ),
            ).toThrow(/Nome completo da categoria não pode conter quebras de linha/)
        })

        it("accepts optional active flag on categoryUpdateBodySchema", () => {
            const parsed = validateSchema(
                categoryUpdateBodySchema,
                {
                    title: "Serviços Financeiros",
                    shortTitle: "Bancos e cartões",
                    description: "Empréstimos e cartões",
                    active: false,
                },
                { withIssues: true },
            )

            expect(parsed.active).toBe(false)
            expect(parsed.description).toBe("Empréstimos e cartões")
        })
    })

    describe("categoryActiveBodySchema and categoryReorderBodySchema", () => {
        it("validates boolean active status", () => {
            expect(
                validateSchema(categoryActiveBodySchema, { active: true }, { withIssues: true }),
            ).toEqual({ active: true })
        })

        it("rejects duplicate or empty categoryIds in reorder", () => {
            expect(() =>
                validateSchema(
                    categoryReorderBodySchema,
                    { categoryIds: [] },
                    { withIssues: true },
                ),
            ).toThrow(/Informe ao menos uma categoria/)

            expect(() =>
                validateSchema(
                    categoryReorderBodySchema,
                    { categoryIds: [1, 2, 1] },
                    { withIssues: true },
                ),
            ).toThrow(/ID de categoria repetido na reordenação/)
        })
    })

    describe("questionListQuerySchema", () => {
        it("accepts categoryId or search term", () => {
            expect(
                validateSchema(
                    questionListQuerySchema,
                    { categoryId: "3" },
                    { withIssues: true },
                ),
            ).toEqual({ categoryId: 3, search: undefined })

            expect(
                validateSchema(
                    questionListQuerySchema,
                    { search: "  garantia  " },
                    { withIssues: true },
                ),
            ).toEqual({ categoryId: undefined, search: "garantia" })
        })

        it("rejects when neither categoryId nor search is provided", () => {
            expect(() =>
                validateSchema(
                    questionListQuerySchema,
                    { search: "   " },
                    { withIssues: true },
                ),
            ).toThrow(/Informe a categoria ou um termo de busca/)
        })
    })

    describe("questionCreateBodySchema, questionUpdateBodySchema, and questionPreviewBodySchema", () => {
        const validQuestionInput = {
            categoryId: 1,
            shortTitle: "Produto com defeito",
            shortDescription: "Prazo de 30 dias para reparo",
            question: "Comprei um produto com defeito, o que fazer?",
            answer: "O fornecedor tem até 30 dias para sanar o vício.",
            legalBasis: "Art. 18 do CDC",
            requiredDocuments: ["  RG ou CNH  ", "Nota fiscal"],
            requiresInPerson: false,
            inPersonNote: "Observação que será ignorada quando não exige presencial",
            outOfScope: false,
        }

        it("normalizes fields, trims documents, clears inPersonNote when requiresInPerson is false, and defaults llmAllowed to true", () => {
            const parsed = validateSchema(
                questionCreateBodySchema,
                validQuestionInput,
                { withIssues: true },
            )

            expect(parsed).toEqual({
                categoryId: 1,
                shortTitle: "Produto com defeito",
                shortDescription: "Prazo de 30 dias para reparo",
                question: "Comprei um produto com defeito, o que fazer?",
                answer: "O fornecedor tem até 30 dias para sanar o vício.",
                legalBasis: "Art. 18 do CDC",
                requiredDocuments: ["RG ou CNH", "Nota fiscal"],
                requiresInPerson: false,
                inPersonNote: null,
                outOfScope: false,
                llmAllowed: true,
                active: true,
            })
        })

        it("defaults llmAllowed to false when outOfScope is true and llmAllowed is omitted", () => {
            const parsed = validateSchema(
                questionCreateBodySchema,
                {
                    ...validQuestionInput,
                    outOfScope: true,
                },
                { withIssues: true },
            )

            expect(parsed.outOfScope).toBe(true)
            expect(parsed.llmAllowed).toBe(false)
        })

        it("rejects mutually exclusive requiresInPerson and outOfScope with field issue", () => {
            try {
                validateSchema(
                    questionCreateBodySchema,
                    {
                        ...validQuestionInput,
                        requiresInPerson: true,
                        outOfScope: true,
                    },
                    { withIssues: true },
                )
                expect.unreachable("Should have thrown BadRequestError")
            } catch (error) {
                expect(error).toBeInstanceOf(BadRequestError)
                const badReq = error as BadRequestError
                expect(badReq.details?.issues).toEqual([
                    {
                        path: "outOfScope",
                        message:
                            "Exige atendimento presencial e Fora do escopo do PROCON são mutuamente exclusivos",
                    },
                ])
            }
        })

        it("rejects outOfScope combined with llmAllowed=true with field issue", () => {
            try {
                validateSchema(
                    questionCreateBodySchema,
                    {
                        ...validQuestionInput,
                        outOfScope: true,
                        llmAllowed: true,
                    },
                    { withIssues: true },
                )
                expect.unreachable("Should have thrown BadRequestError")
            } catch (error) {
                expect(error).toBeInstanceOf(BadRequestError)
                const badReq = error as BadRequestError
                expect(badReq.details?.issues).toEqual([
                    {
                        path: "llmAllowed",
                        message: "Perguntas fora do escopo do PROCON não permitem complemento por IA",
                    },
                ])
            }
        })

        it("rejects answer longer than 3000 characters and shortDescription longer than 72 characters", () => {
            expect(() =>
                validateSchema(
                    questionCreateBodySchema,
                    {
                        ...validQuestionInput,
                        answer: "A".repeat(3001),
                    },
                    { withIssues: true },
                ),
            ).toThrow(/A resposta deve ter no máximo 3\.000 caracteres/)

            expect(() =>
                validateSchema(
                    questionCreateBodySchema,
                    {
                        ...validQuestionInput,
                        shortDescription: "B".repeat(73),
                    },
                    { withIssues: true },
                ),
            ).toThrow(/Descrição curta na lista deve ter no máximo 72 caracteres/)
        })

        it("rejects control characters in shortTitle and shortDescription", () => {
            expect(() =>
                validateSchema(
                    questionCreateBodySchema,
                    {
                        ...validQuestionInput,
                        shortTitle: "Título\tcom tab",
                    },
                    { withIssues: true },
                ),
            ).toThrow(/Título curto na lista não pode conter quebras de linha/)

            expect(() =>
                validateSchema(
                    questionCreateBodySchema,
                    {
                        ...validQuestionInput,
                        shortDescription: "Descrição\ncom quebra",
                    },
                    { withIssues: true },
                ),
            ).toThrow(/Descrição curta na lista não pode conter quebras de linha/)
        })

        it("preserves inPersonNote on update and preview when requiresInPerson is true", () => {
            const updated = validateSchema(
                questionUpdateBodySchema,
                {
                    ...validQuestionInput,
                    categoryId: undefined,
                    requiresInPerson: true,
                    inPersonNote: "  Traga o contrato impresso  ",
                },
                { withIssues: true },
            )
            expect(updated.inPersonNote).toBe("Traga o contrato impresso")

            const preview = validateSchema(
                questionPreviewBodySchema,
                {
                    ...validQuestionInput,
                    questionId: 10,
                    requiresInPerson: true,
                    inPersonNote: "  Traga o contrato impresso  ",
                },
                { withIssues: true },
            )
            expect(preview.questionId).toBe(10)
            expect(preview.inPersonNote).toBe("Traga o contrato impresso")
        })
    })

    describe("questionActiveBodySchema and questionReorderBodySchema", () => {
        it("validates active toggle and unique questionIds", () => {
            expect(
                validateSchema(questionActiveBodySchema, { active: false }, { withIssues: true }),
            ).toEqual({ active: false })

            expect(
                validateSchema(
                    questionReorderBodySchema,
                    { questionIds: [10, 20, 30] },
                    { withIssues: true },
                ),
            ).toEqual({ questionIds: [10, 20, 30] })

            expect(() =>
                validateSchema(
                    questionReorderBodySchema,
                    { questionIds: [10, 10] },
                    { withIssues: true },
                ),
            ).toThrow(/ID de pergunta repetido na reordenação/)
        })
    })
})
