import { z } from "zod"
import type {
    BlockedDateInputItem,
    MinNoticeDays,
    ReminderHours,
    ScheduleConfigInput,
    ScheduleRangeInputItem,
    SlotMinutes,
} from "../types/schedule.types"

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

export function isValidCalendarDate(dateStr: string): boolean {
    if (!DATE_REGEX.test(dateStr)) {
        return false
    }
    const [y, m, d] = dateStr.split("-").map(Number)
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
        return false
    }
    const dt = new Date(Date.UTC(y, m - 1, d))
    return (
        dt.getUTCFullYear() === y &&
        dt.getUTCMonth() === m - 1 &&
        dt.getUTCDate() === d
    )
}

export function isValidMonthString(monthStr: string): boolean {
    return MONTH_REGEX.test(monthStr)
}

function parseTimeMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
}

const slotMinutesSchema = z.union(
    [z.literal(20), z.literal(30), z.literal(40), z.literal(60)],
    { message: "Duração deve ser 20, 30, 40 ou 60 minutos" },
) as z.ZodType<SlotMinutes>

const minNoticeDaysSchema = z.union(
    [z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(5)],
    { message: "Antecedência mínima deve ser 0, 1, 2, 3 ou 5 dias úteis" },
) as z.ZodType<MinNoticeDays>

const reminderHoursSchema = z.union(
    [z.literal(2), z.literal(6), z.literal(12), z.literal(24), z.literal(48)],
    { message: "Horas do lembrete devem ser 2, 6, 12, 24 ou 48" },
) as z.ZodType<ReminderHours>

function integerBetween(min: number, max: number, message: string) {
    return z.number({ message }).int({ message }).min(min, { message }).max(max, { message })
}

const timeStringSchema = z
    .string()
    .trim()
    .regex(TIME_REGEX, { message: "Horário deve estar no formato HH:MM" })

export const scheduleRangeItemSchema: z.ZodType<ScheduleRangeInputItem> = z.object({
    weekday: integerBetween(0, 6, "Dia da semana inválido"),
    slotIndex: z.number().int().min(1).max(3).optional(),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
})

export const blockedDateItemSchema: z.ZodType<BlockedDateInputItem> = z
    .object({
        date: z
            .string()
            .trim()
            .refine(isValidCalendarDate, { message: "Data inválida (use YYYY-MM-DD)" }),
        startTime: timeStringSchema.nullable().optional(),
        endTime: timeStringSchema.nullable().optional(),
        description: z
            .string()
            .trim()
            .min(1, { message: "Descrição do bloqueio obrigatória" })
            .max(150, { message: "Descrição deve ter no máximo 150 caracteres" }),
    })
    .superRefine((item: BlockedDateInputItem, ctx: z.RefinementCtx) => {
        const hasStart = item.startTime !== undefined && item.startTime !== null
        const hasEnd = item.endTime !== undefined && item.endTime !== null
        if (hasStart !== hasEnd) {
            ctx.addIssue({
                code: "custom",
                path: ["startTime"],
                message: "Bloqueio parcial exige horário inicial e final",
            })
            return
        }
        if (hasStart && hasEnd) {
            if (parseTimeMinutes(item.endTime!) <= parseTimeMinutes(item.startTime!)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["endTime"],
                    message: "O fim do bloqueio deve ser depois do início",
                })
            }
        }
    })

export const scheduleConfigBodySchema: z.ZodType<ScheduleConfigInput> = z
    .object({
        slotMinutes: slotMinutesSchema,
        seatsPerSlot: integerBetween(1, 20, "Vagas por horário devem estar entre 1 e 20"),
        windowDays: integerBetween(1, 180, "Janela de agendamento deve estar entre 1 e 180 dias"),
        minNoticeDays: minNoticeDaysSchema,
        waitAlertDays: integerBetween(1, 60, "Alerta de espera deve estar entre 1 e 60 dias"),
        unitAddress: z
            .string()
            .trim()
            .min(1, { message: "Endereço da unidade obrigatório" })
            .max(500, { message: "Endereço da unidade obrigatório" }),
        unitAddressComplement: z
            .string()
            .trim()
            .max(500, { message: "Complemento deve ter no máximo 500 caracteres" })
            .transform((val: string) => (val === "" ? null : val))
            .nullable()
            .optional(),
        reminderEnabled: z.boolean({ message: "Configuração de lembrete inválida" }),
        reminderHours: reminderHoursSchema,
        ranges: z.array(scheduleRangeItemSchema).max(21),
        blockedDates: z.array(blockedDateItemSchema).max(366).default([]),
    })
    .superRefine((data: ScheduleConfigInput, ctx: z.RefinementCtx) => {
        const byWeekday = new Map<number, { idx: number; item: ScheduleRangeInputItem }[]>()
        data.ranges.forEach((range: ScheduleRangeInputItem, idx: number) => {
            const list = byWeekday.get(range.weekday) ?? []
            list.push({ idx, item: range })
            byWeekday.set(range.weekday, list)
        })

        for (const [_weekday, entries] of byWeekday.entries()) {
            if (entries.length > 3) {
                ctx.addIssue({
                    code: "custom",
                    path: ["ranges", entries[3]!.idx, "weekday"],
                    message: "Cada dia da semana pode ter no máximo 3 faixas de horário",
                })
            }

            const seenSlotIndexes = new Set<number>()
            for (const { idx, item } of entries) {
                if (item.slotIndex !== undefined) {
                    if (seenSlotIndexes.has(item.slotIndex)) {
                        ctx.addIssue({
                            code: "custom",
                            path: ["ranges", idx, "slotIndex"],
                            message: "Índice de faixa repetido no mesmo dia",
                        })
                    }
                    seenSlotIndexes.add(item.slotIndex)
                }

                const startMin = parseTimeMinutes(item.startTime)
                const endMin = parseTimeMinutes(item.endTime)

                if (endMin <= startMin) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["ranges", idx, "endTime"],
                        message: "O fim deve ser depois do início",
                    })
                } else if (endMin - startMin < data.slotMinutes) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["ranges", idx, "endTime"],
                        message: `Esta faixa não comporta nenhum atendimento de ${data.slotMinutes} minutos`,
                    })
                }
            }

            for (let i = 0; i < entries.length; i++) {
                for (let j = i + 1; j < entries.length; j++) {
                    const a = entries[i]!
                    const b = entries[j]!
                    const aStart = parseTimeMinutes(a.item.startTime)
                    const aEnd = parseTimeMinutes(a.item.endTime)
                    const bStart = parseTimeMinutes(b.item.startTime)
                    const bEnd = parseTimeMinutes(b.item.endTime)
                    if (aEnd > aStart && bEnd > bStart && Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
                        ctx.addIssue({
                            code: "custom",
                            path: ["ranges", b.idx, "startTime"],
                            message: "Esta faixa se sobrepõe a outra faixa do mesmo dia",
                        })
                    }
                }
            }
        }

        const blocksByDate = new Map<string, { idx: number; item: BlockedDateInputItem }[]>()
        data.blockedDates.forEach((block: BlockedDateInputItem, idx: number) => {
            const list = blocksByDate.get(block.date) ?? []
            list.push({ idx, item: block })
            blocksByDate.set(block.date, list)
        })

        for (const [_date, entries] of blocksByDate.entries()) {
            for (let i = 0; i < entries.length; i++) {
                for (let j = i + 1; j < entries.length; j++) {
                    const a = entries[i]!.item
                    const b = entries[j]!.item
                    const aFull = !a.startTime || !a.endTime
                    const bFull = !b.startTime || !b.endTime
                    if (aFull || bFull) {
                        ctx.addIssue({
                            code: "custom",
                            path: ["blockedDates", entries[j]!.idx, "date"],
                            message: "Esta data já tem um bloqueio",
                        })
                    } else {
                        const aStart = parseTimeMinutes(a.startTime!)
                        const aEnd = parseTimeMinutes(a.endTime!)
                        const bStart = parseTimeMinutes(b.startTime!)
                        const bEnd = parseTimeMinutes(b.endTime!)
                        if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
                            ctx.addIssue({
                                code: "custom",
                                path: ["blockedDates", entries[j]!.idx, "startTime"],
                                message: "Período bloqueado sobreposto na mesma data",
                            })
                        }
                    }
                }
            }
        }
    })

export const previewScheduleQuerySchema = z.object({
    month: z
        .string()
        .trim()
        .refine(isValidMonthString, { message: "Mês inválido (use YYYY-MM)" })
        .optional(),
})

export type PreviewScheduleQuery = z.infer<typeof previewScheduleQuerySchema>

export const previewScheduleBodySchema = z.object({
    month: z
        .string()
        .trim()
        .refine(isValidMonthString, { message: "Mês inválido (use YYYY-MM)" })
        .optional(),
    config: scheduleConfigBodySchema.optional(),
})

export type PreviewScheduleBody = z.infer<typeof previewScheduleBodySchema>
