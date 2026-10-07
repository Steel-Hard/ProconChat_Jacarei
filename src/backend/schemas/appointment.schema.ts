import { z } from "zod"
import { NextFunction, Request, Response } from "express"
import BadRequestError from "../errors/BadRequestError"

export const listAppointmentsQuerySchema = z.object({
  search: z.string().trim().optional(),
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
  responsible: z.string().trim().optional().default("all"),
  sortBy: z
    .enum(["name", "appointment_datetime", "responsible", "status"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>

export const appointmentIdParamSchema = z.object({
  id: z.string().trim().min(1, "ID ou código do agendamento é obrigatório"),
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
      .map((err) => `${err.path.join(".")}: ${err.message}`)
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
