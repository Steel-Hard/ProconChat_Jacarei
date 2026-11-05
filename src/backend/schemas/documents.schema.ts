import { z } from "zod"

export const documentsBodySchema = z.object({
    holder: z.array(z.string().trim().min(1).max(255)),
    representative: z.array(z.string().trim().min(1).max(255))
})

export const previewBodySchema = z.object({
    byRepresentative: z.boolean(),
    groupDocuments: z.array(z.string().trim().min(1).max(255)),
    questionId: z.union([z.string(), z.number()]).optional()
})

export type DocumentsBodyInput = z.infer<typeof documentsBodySchema>
export type PreviewBodyInput = z.infer<typeof previewBodySchema>
