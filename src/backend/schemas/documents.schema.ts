import { z } from "zod"
import { normalizeDocument } from "../utils/documentMatch"

export const MAX_DOCUMENTS_PER_GROUP = 10

const MAX_DOCUMENT_LENGTH = 255
const EXCERPT_LENGTH = 30

function excerpt(text: string): string {
    return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH)}…` : text
}

const documentItemSchema = z
    .string()
    .trim()
    .superRefine((item, ctx) => {
        if (item.length === 0) {
            ctx.addIssue({ code: "custom", message: "Há um documento vazio na lista." })
        } else if (item.length > MAX_DOCUMENT_LENGTH) {
            ctx.addIssue({
                code: "custom",
                message: `O documento "${excerpt(item)}" passa de ${MAX_DOCUMENT_LENGTH} caracteres.`
            })
        }
    })

const groupSchema = z
    .array(documentItemSchema)
    .max(MAX_DOCUMENTS_PER_GROUP, {
        message: `Limite de ${MAX_DOCUMENTS_PER_GROUP} documentos por grupo.`
    })
    .superRefine((items, ctx) => {
        const seen = new Set<string>()
        items.forEach((item, index) => {
            const key = normalizeDocument(item)
            if (seen.has(key)) {
                ctx.addIssue({
                    code: "custom",
                    path: [index],
                    message: `O documento "${item}" já está na lista.`
                })
            }
            seen.add(key)
        })
    })

export const documentsBodySchema = z.object({
    holder: groupSchema,
    representative: groupSchema
})

export const previewBodySchema = z.object({
    byRepresentative: z.boolean(),
    groupDocuments: groupSchema,
    questionId: z
        .unknown()
        .transform((value, ctx): number | undefined => {
            if (value === undefined) {
                return undefined
            }
            const parsed =
                typeof value === "string" && /^[1-9]\d*$/.test(value) ? Number(value) : value
            if (typeof parsed !== "number" || !Number.isSafeInteger(parsed) || parsed <= 0) {
                ctx.addIssue({ code: "custom", message: "Pergunta inválida." })
                return z.NEVER
            }
            return parsed
        })
        .optional()
})

export type DocumentsBodyInput = z.infer<typeof documentsBodySchema>
export type PreviewBodyInput = z.infer<typeof previewBodySchema>
