import { z } from "zod"
import type {
    CategoryActiveInput,
    CategoryCreateInput,
    CategoryReorderInput,
    CategoryUpdateInput,
    QuestionActiveInput,
    QuestionListQuery,
    QuestionPreviewInput,
    QuestionReorderInput,
    QuestionWriteInput,
} from "../types/content.types"

const MAX_CATEGORY_TITLE_LENGTH = 150
const MAX_SHORT_TITLE_LENGTH = 24
const MAX_SHORT_DESCRIPTION_LENGTH = 72
const MAX_DESCRIPTION_LENGTH = 500
const MAX_QUESTION_LENGTH = 500
const MAX_ANSWER_LENGTH = 3000
const MAX_LEGAL_BASIS_LENGTH = 500
const MAX_IN_PERSON_NOTE_LENGTH = 500
const MAX_DOCUMENT_LENGTH = 255
const MAX_DOCUMENTS_COUNT = 30
const MAX_REORDER_ITEMS = 500
const MAX_SEARCH_LENGTH = 200

const NO_CONTROL_CHARS_REGEX = /^[^\r\n\t]+$/

const positiveIdSchema = z
    .number({ message: "ID inválido" })
    .int({ message: "ID inválido" })
    .min(1, { message: "ID inválido" })
    .max(Number.MAX_SAFE_INTEGER, { message: "ID inválido" })

const stringIdParamField = z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, { message: "ID inválido" })
    .transform(Number)
    .refine(Number.isSafeInteger, { message: "ID inválido" })

export const contentIdParamSchema = z.object({
    id: stringIdParamField,
})

export type ContentIdParam = z.infer<typeof contentIdParamSchema>

const categoryTitleSchema = z
    .string({ message: "Nome completo da categoria obrigatório" })
    .trim()
    .min(1, { message: "Nome completo da categoria obrigatório" })
    .max(MAX_CATEGORY_TITLE_LENGTH, {
        message: "Nome completo da categoria deve ter no máximo 150 caracteres",
    })
    .refine((val: string) => NO_CONTROL_CHARS_REGEX.test(val), {
        message: "Nome completo da categoria não pode conter quebras de linha ou tabulações",
    })

const categoryShortTitleSchema = z
    .string({ message: "Título curto da categoria obrigatório" })
    .trim()
    .min(1, { message: "Título curto da categoria obrigatório" })
    .max(MAX_SHORT_TITLE_LENGTH, {
        message: "Título curto da categoria deve ter entre 1 e 24 caracteres",
    })
    .refine((val: string) => NO_CONTROL_CHARS_REGEX.test(val), {
        message: "Título curto da categoria não pode conter quebras de linha ou tabulações",
    })

const categoryDescriptionSchema = z
    .string({ message: "Descrição da categoria inválida" })
    .trim()
    .max(MAX_DESCRIPTION_LENGTH, {
        message: "Descrição da categoria deve ter no máximo 500 caracteres",
    })
    .transform((val: string) => (val === "" ? null : val))
    .nullable()
    .optional()
    .transform((val: string | null | undefined) => val ?? null)

export const categoryCreateBodySchema: z.ZodType<CategoryCreateInput> = z.object({
    title: categoryTitleSchema,
    shortTitle: categoryShortTitleSchema,
    description: categoryDescriptionSchema,
})

export const categoryUpdateBodySchema: z.ZodType<CategoryUpdateInput> = z.object({
    title: categoryTitleSchema,
    shortTitle: categoryShortTitleSchema,
    description: categoryDescriptionSchema,
    active: z.boolean({ message: "Status ativo inválido" }).optional(),
})

export const categoryActiveBodySchema: z.ZodType<CategoryActiveInput> = z.object({
    active: z.boolean({ message: "Status ativo inválido" }),
})

export const categoryReorderBodySchema: z.ZodType<CategoryReorderInput> = z.object({
    categoryIds: z
        .array(positiveIdSchema, { message: "Lista de categorias obrigatória" })
        .min(1, { message: "Informe ao menos uma categoria para reordenar" })
        .max(MAX_REORDER_ITEMS, { message: "Limite de categorias excedido" })
        .refine((ids: number[]) => new Set(ids).size === ids.length, {
            message: "ID de categoria repetido na reordenação",
        }),
})

export const questionListQuerySchema: z.ZodType<QuestionListQuery> = z
    .object({
        categoryId: z
            .string()
            .trim()
            .regex(/^[1-9]\d*$/, { message: "Categoria inválida" })
            .transform(Number)
            .refine(Number.isSafeInteger, { message: "Categoria inválida" })
            .optional(),
        search: z
            .string()
            .trim()
            .max(MAX_SEARCH_LENGTH, { message: "Termo de busca deve ter no máximo 200 caracteres" })
            .transform((val: string) => (val === "" ? undefined : val))
            .optional(),
    })
    .superRefine((query: QuestionListQuery, ctx: z.RefinementCtx) => {
        if (query.categoryId === undefined && query.search === undefined) {
            ctx.addIssue({
                code: "custom",
                path: ["categoryId"],
                message: "Informe a categoria ou um termo de busca",
            })
        }
    })

const questionShortTitleSchema = z
    .string({ message: "Título curto na lista obrigatório" })
    .trim()
    .min(1, { message: "Título curto na lista obrigatório" })
    .max(MAX_SHORT_TITLE_LENGTH, {
        message: "Título curto na lista deve ter entre 1 e 24 caracteres",
    })
    .refine((val: string) => NO_CONTROL_CHARS_REGEX.test(val), {
        message: "Título curto na lista não pode conter quebras de linha ou tabulações",
    })

const questionShortDescriptionSchema = z
    .string({ message: "Descrição curta na lista inválida" })
    .trim()
    .max(MAX_SHORT_DESCRIPTION_LENGTH, {
        message: "Descrição curta na lista deve ter no máximo 72 caracteres",
    })
    .refine((val: string) => val === "" || NO_CONTROL_CHARS_REGEX.test(val), {
        message: "Descrição curta na lista não pode conter quebras de linha ou tabulações",
    })
    .transform((val: string) => (val === "" ? null : val))
    .nullable()
    .optional()
    .transform((val: string | null | undefined) => val ?? null)

const questionTextSchema = z
    .string({ message: "Texto da pergunta obrigatório" })
    .trim()
    .min(1, { message: "Texto da pergunta obrigatório" })
    .max(MAX_QUESTION_LENGTH, {
        message: "Texto da pergunta deve ter no máximo 500 caracteres",
    })

const answerTextSchema = z
    .string({ message: "Texto da resposta obrigatório" })
    .trim()
    .min(1, { message: "Texto da resposta obrigatório" })
    .max(MAX_ANSWER_LENGTH, {
        message: "A resposta deve ter no máximo 3.000 caracteres",
    })

const legalBasisSchema = z
    .string({ message: "Base legal inválida" })
    .trim()
    .max(MAX_LEGAL_BASIS_LENGTH, {
        message: "Base legal deve ter no máximo 500 caracteres",
    })
    .transform((val: string) => (val === "" ? null : val))
    .nullable()
    .optional()
    .transform((val: string | null | undefined) => val ?? null)

const requiredDocumentItemSchema = z
    .string({ message: "Descrição do documento obrigatória" })
    .trim()
    .min(1, { message: "Descrição do documento obrigatória" })
    .max(MAX_DOCUMENT_LENGTH, {
        message: "Descrição do documento deve ter no máximo 255 caracteres",
    })

const requiredDocumentsListSchema = z
    .array(requiredDocumentItemSchema, { message: "Lista de documentos inválida" })
    .max(MAX_DOCUMENTS_COUNT, {
        message: "Informe no máximo 30 documentos necessários",
    })
    .default([])

const inPersonNoteSchema = z
    .string({ message: "Observação sobre o atendimento presencial inválida" })
    .trim()
    .max(MAX_IN_PERSON_NOTE_LENGTH, {
        message: "Observação sobre o atendimento presencial deve ter no máximo 500 caracteres",
    })
    .transform((val: string) => (val === "" ? null : val))
    .nullable()
    .optional()
    .transform((val: string | null | undefined) => val ?? null)

interface RawQuestionFields {
    categoryId: number
    shortTitle: string
    shortDescription: string | null
    question: string
    answer: string
    legalBasis: string | null
    requiredDocuments: string[]
    requiresInPerson: boolean
    inPersonNote: string | null
    outOfScope: boolean
    llmAllowed?: boolean
    active: boolean
}

function validateQuestionCrossFields(
    data: {
        requiresInPerson: boolean
        outOfScope: boolean
        llmAllowed?: boolean
    },
    ctx: z.RefinementCtx,
): void {
    if (data.requiresInPerson && data.outOfScope) {
        ctx.addIssue({
            code: "custom",
            path: ["outOfScope"],
            message:
                "Exige atendimento presencial e Fora do escopo do PROCON são mutuamente exclusivos",
        })
    }

    if (data.outOfScope && data.llmAllowed === true) {
        ctx.addIssue({
            code: "custom",
            path: ["llmAllowed"],
            message: "Perguntas fora do escopo do PROCON não permitem complemento por IA",
        })
    }
}

export const questionCreateBodySchema: z.ZodType<QuestionWriteInput> = z
    .object({
        categoryId: positiveIdSchema,
        shortTitle: questionShortTitleSchema,
        shortDescription: questionShortDescriptionSchema,
        question: questionTextSchema,
        answer: answerTextSchema,
        legalBasis: legalBasisSchema,
        requiredDocuments: requiredDocumentsListSchema,
        requiresInPerson: z.boolean({ message: "Campo exige atendimento presencial inválido" }).default(false),
        inPersonNote: inPersonNoteSchema,
        outOfScope: z.boolean({ message: "Campo fora do escopo inválido" }).default(false),
        llmAllowed: z.boolean({ message: "Campo complemento por IA inválido" }).optional(),
        active: z.boolean({ message: "Status ativo inválido" }).default(true),
    })
    .superRefine((data: RawQuestionFields, ctx: z.RefinementCtx) => {
        validateQuestionCrossFields(data, ctx)
    })
    .transform(
        (data: RawQuestionFields): QuestionWriteInput => ({
            categoryId: data.categoryId,
            shortTitle: data.shortTitle,
            shortDescription: data.shortDescription,
            question: data.question,
            answer: data.answer,
            legalBasis: data.legalBasis,
            requiredDocuments: data.requiredDocuments,
            requiresInPerson: data.requiresInPerson,
            inPersonNote: data.requiresInPerson ? data.inPersonNote : null,
            outOfScope: data.outOfScope,
            llmAllowed: data.outOfScope ? false : (data.llmAllowed ?? true),
            active: data.active,
        }),
    )

export type QuestionUpdateBody = Omit<QuestionWriteInput, "categoryId" | "active"> & {
    categoryId?: number
    active?: boolean
}

interface RawQuestionUpdateFields extends Omit<RawQuestionFields, "categoryId" | "active"> {
    categoryId?: number
    active?: boolean
}

export const questionUpdateBodySchema: z.ZodType<QuestionUpdateBody> = z
    .object({
        categoryId: positiveIdSchema.optional(),
        shortTitle: questionShortTitleSchema,
        shortDescription: questionShortDescriptionSchema,
        question: questionTextSchema,
        answer: answerTextSchema,
        legalBasis: legalBasisSchema,
        requiredDocuments: requiredDocumentsListSchema,
        requiresInPerson: z.boolean({ message: "Campo exige atendimento presencial inválido" }).default(false),
        inPersonNote: inPersonNoteSchema,
        outOfScope: z.boolean({ message: "Campo fora do escopo inválido" }).default(false),
        llmAllowed: z.boolean({ message: "Campo complemento por IA inválido" }).optional(),
        active: z.boolean({ message: "Status ativo inválido" }).optional(),
    })
    .superRefine((data: RawQuestionUpdateFields, ctx: z.RefinementCtx) => {
        validateQuestionCrossFields(data, ctx)
    })
    .transform(
        (data: RawQuestionUpdateFields): QuestionUpdateBody => ({
            categoryId: data.categoryId,
            shortTitle: data.shortTitle,
            shortDescription: data.shortDescription,
            question: data.question,
            answer: data.answer,
            legalBasis: data.legalBasis,
            requiredDocuments: data.requiredDocuments,
            requiresInPerson: data.requiresInPerson,
            inPersonNote: data.requiresInPerson ? data.inPersonNote : null,
            outOfScope: data.outOfScope,
            llmAllowed: data.outOfScope ? false : (data.llmAllowed ?? true),
            active: data.active,
        }),
    )

export const questionActiveBodySchema: z.ZodType<QuestionActiveInput> = z.object({
    active: z.boolean({ message: "Status ativo inválido" }),
})

export const questionReorderBodySchema: z.ZodType<QuestionReorderInput> = z.object({
    questionIds: z
        .array(positiveIdSchema, { message: "Lista de perguntas obrigatória" })
        .min(1, { message: "Informe ao menos uma pergunta para reordenar" })
        .max(MAX_REORDER_ITEMS, { message: "Limite de perguntas excedido" })
        .refine((ids: number[]) => new Set(ids).size === ids.length, {
            message: "ID de pergunta repetido na reordenação",
        }),
})

interface RawQuestionPreviewFields extends Omit<RawQuestionFields, "active"> {
    questionId?: number
}

export const questionPreviewBodySchema: z.ZodType<QuestionPreviewInput> = z
    .object({
        questionId: positiveIdSchema.optional(),
        categoryId: positiveIdSchema,
        shortTitle: questionShortTitleSchema,
        shortDescription: questionShortDescriptionSchema,
        question: questionTextSchema,
        answer: answerTextSchema,
        legalBasis: legalBasisSchema,
        requiredDocuments: requiredDocumentsListSchema,
        requiresInPerson: z.boolean({ message: "Campo exige atendimento presencial inválido" }).default(false),
        inPersonNote: inPersonNoteSchema,
        outOfScope: z.boolean({ message: "Campo fora do escopo inválido" }).default(false),
        llmAllowed: z.boolean({ message: "Campo complemento por IA inválido" }).optional(),
    })
    .superRefine((data: RawQuestionPreviewFields, ctx: z.RefinementCtx) => {
        validateQuestionCrossFields(data, ctx)
    })
    .transform(
        (data: RawQuestionPreviewFields): QuestionPreviewInput => ({
            questionId: data.questionId,
            categoryId: data.categoryId,
            shortTitle: data.shortTitle,
            shortDescription: data.shortDescription,
            question: data.question,
            answer: data.answer,
            legalBasis: data.legalBasis,
            requiredDocuments: data.requiredDocuments,
            requiresInPerson: data.requiresInPerson,
            inPersonNote: data.requiresInPerson ? data.inPersonNote : null,
            outOfScope: data.outOfScope,
            llmAllowed: data.outOfScope ? false : (data.llmAllowed ?? true),
        }),
    )
