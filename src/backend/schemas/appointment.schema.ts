import { z } from "zod"
import { NextFunction, Request, Response } from "express"
import BadRequestError from "../errors/BadRequestError"

const MAX_BIGINT = 9223372036854775807n

export const listAppointmentsQuerySchema = z.object({
    search: z
        .string()
        .trim()
        .refine((val: string) => val.length === 0 || val.length >= 2, {
            message: "Busca deve ter no mínimo 2 caracteres",
        })
        .transform((val: string) => (val === "" ? undefined : val))
        .optional(),
    status: z
        .enum([
            "all",
            "PENDING",
            "CONFIRMED",
            "ATTENDED",
            "NO_SHOW",
            "CANCELED",
            "waiting_record",
        ])
        .optional()
        .default("all"),
    period: z
        .enum(["all", "today", "this_week", "upcoming", "past"])
        .optional()
        .default("upcoming"),
    responsible: z
        .string()
        .trim()
        .refine(
            (val: string) => val === "all" || val === "unassigned" || val === "me" || /^\d+$/.test(val),
            { message: "Responsável inválido" },
        )
        .optional()
        .default("all"),
    sortBy: z
        .enum(["name", "appointment_datetime", "responsible", "status"])
        .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>

export const appointmentIdParamSchema = z.object({
    id: z
        .string()
        .trim()
        .refine(
            (val: string) => {
                if (!/^\d+$/.test(val)) {
                    return false
                }
                try {
                    const n = BigInt(val)
                    return n > 0n && n <= MAX_BIGINT
                } catch {
                    return false
                }
            },
            { message: "ID do agendamento inválido" },
        ),
})

export type AppointmentIdParam = z.infer<typeof appointmentIdParamSchema>

export const updateStatusBodySchema = z.object({
    action: z.enum(["claim", "attended", "no_show"], {
        message: "Ação inválida. Valores aceitos: claim, attended, no_show",
    }),
})

export type UpdateStatusBody = z.infer<typeof updateStatusBodySchema>

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data)
    if (!result.success) {
        const issues = result.error.issues || []
        const errorDetails = issues
            .map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`)
            .join("; ")
        throw new BadRequestError(`Dados inválidos: ${errorDetails}`)
    }
    return result.data
}

export function validateRequest(schemas: {
    query?: z.ZodSchema
    params?: z.ZodSchema
    body?: z.ZodSchema
}) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            if (schemas.query) {
                const validatedQuery = validateSchema(schemas.query, req.query)
                Object.defineProperty(req, "query", {
                    value: validatedQuery,
                    configurable: true,
                    writable: true,
                })
            }
            if (schemas.params) {
                const validatedParams = validateSchema(schemas.params, req.params)
                Object.defineProperty(req, "params", {
                    value: validatedParams,
                    configurable: true,
                    writable: true,
                })
            }
            if (schemas.body) {
                req.body = validateSchema(schemas.body, req.body)
            }
            next()
        } catch (error) {
            next(error)
        }
    }
}
