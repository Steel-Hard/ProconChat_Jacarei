import { z } from "zod"

const MAX_BIGINT = 9223372036854775807n

export function isValidAppointmentId(val: string): boolean {
    if (!/^\d+$/.test(val)) {
        return false
    }
    try {
        const n = BigInt(val)
        return n > 0n && n <= MAX_BIGINT
    } catch {
        return false
    }
}

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
        .refine(isValidAppointmentId, { message: "ID do agendamento inválido" }),
})

export type AppointmentIdParam = z.infer<typeof appointmentIdParamSchema>

const ACTION_MESSAGE = "Ação inválida. Valores aceitos: claim, attended, no_show, assign, correct_record"

const userIdSchema = z
    .union([z.number(), z.string().trim().regex(/^\d+$/)])
    .transform((value) => Number(value))
    .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))

export const updateStatusBodySchema = z.discriminatedUnion(
    "action",
    [
        z.object({ action: z.literal("claim") }),
        z.object({ action: z.literal("attended") }),
        z.object({ action: z.literal("no_show") }),
        z.object({ action: z.literal("assign"), assigneeUserId: userIdSchema }),
        z.object({ action: z.literal("correct_record") }),
    ],
    { error: ACTION_MESSAGE },
)

export type UpdateStatusBody = z.infer<typeof updateStatusBodySchema>

export const addNoteBodySchema = z.object({
    text: z
        .string({ error: "Texto da observação é obrigatório" })
        .trim()
        .min(1, { message: "A observação não pode ficar vazia" })
        .max(2000, { message: "A observação pode ter no máximo 2000 caracteres" }),
})

export type AddNoteBody = z.infer<typeof addNoteBodySchema>

function isCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false
    }
    const [y, m, d] = value.split("-").map(Number)
    const date = new Date(Date.UTC(y!, m! - 1, d!))
    return date.toISOString().slice(0, 10) === value
}

export const calendarQuerySchema = z.object({
    date: z.string().trim().refine(isCalendarDate, { message: "Data inválida. Use AAAA-MM-DD" }).optional(),
    status: listAppointmentsQuerySchema.shape.status,
    responsible: listAppointmentsQuerySchema.shape.responsible,
})

export type CalendarQuery = z.infer<typeof calendarQuerySchema>
