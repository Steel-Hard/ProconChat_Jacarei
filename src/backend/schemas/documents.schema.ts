import { z } from "zod"
import { normalizeDocument } from "../utils/documentMatch"

export const MAX_DOCUMENTS_PER_GROUP = 10

const documentItemSchema = z.string().trim().min(1).max(255)

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
        .union([
            z.number().int().positive(),
            z.string().regex(/^[1-9]\d*$/).transform(Number)
        ])
        .optional()
})

export type DocumentsBodyInput = z.infer<typeof documentsBodySchema>
export type PreviewBodyInput = z.infer<typeof previewBodySchema>
