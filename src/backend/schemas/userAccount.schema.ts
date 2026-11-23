import { z } from "zod"
import { PERMISSIONS } from "../types/auth.types"

const MAX_NAME_LENGTH = 150
const MAX_EMAIL_LENGTH = 150
const MAX_BATCH_SIZE = 100

const positiveIdSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER)

export const userIdParamSchema = z.object({
    id: z
        .string()
        .trim()
        .regex(/^[1-9]\d*$/, { message: "ID da conta inválido" })
        .transform(Number)
        .refine(Number.isSafeInteger, { message: "ID da conta inválido" }),
})

export type UserIdParam = z.infer<typeof userIdParamSchema>

export const createAccountBodySchema = z.object({
    name: z.string().trim().min(1, { message: "Nome obrigatório" }).max(MAX_NAME_LENGTH),
    email: z.string().trim().max(MAX_EMAIL_LENGTH).pipe(z.email({ message: "E-mail inválido" })),
    password: z.string(),
})

export type CreateAccountBody = z.infer<typeof createAccountBodySchema>

export const resetPasswordBodySchema = z.object({
    password: z.string(),
})

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>

const reassignmentSchema = z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("pending") }),
    z.object({ mode: z.literal("assign"), toUserId: positiveIdSchema }),
])

const permissionsSchema = z
    .array(z.enum(PERMISSIONS))
    .refine((permissions) => new Set(permissions).size === permissions.length, {
        message: "Permissão repetida",
    })

const accountChangeSchema = z
    .object({
        userId: positiveIdSchema,
        permissions: permissionsSchema.optional(),
        active: z.boolean().optional(),
        reassignment: reassignmentSchema.optional(),
    })
    .refine((change) => change.permissions !== undefined || change.active !== undefined, {
        message: "Informe permissions ou active",
    })

export const accountBatchBodySchema = z.object({
    changes: z
        .array(accountChangeSchema)
        .min(1)
        .max(MAX_BATCH_SIZE)
        .refine((changes) => new Set(changes.map((change) => change.userId)).size === changes.length, {
            message: "Conta repetida no lote",
        }),
})

export type AccountBatchBody = z.infer<typeof accountBatchBodySchema>
