import { z } from "zod"
import type { ReportPeriodPreset, ReportQueryInput } from "../types/report.types"
import { toLocalDateString } from "../utils/date.utils"
import { isValidCalendarDate } from "./schedule.schema"

export { isValidCalendarDate }

export const REPORT_PERIOD_PRESETS: readonly ReportPeriodPreset[] = [
    "7d",
    "30d",
    "90d",
    "current_month",
    "previous_month",
    "custom",
]

const periodPresetSchema = z.union(
    [
        z.literal("7d"),
        z.literal("30d"),
        z.literal("90d"),
        z.literal("current_month"),
        z.literal("previous_month"),
        z.literal("custom"),
    ],
    {
        message:
            "Período inválido (use 7d, 30d, 90d, current_month, previous_month ou custom)",
    },
) as z.ZodType<ReportPeriodPreset>

const dateStringSchema = z
    .string({ message: "Data inválida (use YYYY-MM-DD)" })
    .trim()
    .refine(isValidCalendarDate, { message: "Data inválida (use YYYY-MM-DD)" })

export function createReportQuerySchema(
    nowProvider: () => Date = () => new Date(),
): z.ZodType<ReportQueryInput> {
    return z
        .object({
            period: periodPresetSchema.optional(),
            startDate: dateStringSchema.optional(),
            endDate: dateStringSchema.optional(),
        })
        .superRefine((data: ReportQueryInput, ctx: z.RefinementCtx) => {
            const hasStart = data.startDate !== undefined
            const hasEnd = data.endDate !== undefined
            const effectivePreset =
                data.period ?? (hasStart || hasEnd ? "custom" : "30d")

            if (effectivePreset !== "custom") {
                if (hasStart) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["startDate"],
                        message:
                            "Data inicial só pode ser informada no período personalizado",
                    })
                }
                if (hasEnd) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["endDate"],
                        message:
                            "Data final só pode ser informada no período personalizado",
                    })
                }
                return
            }

            if (!hasStart) {
                ctx.addIssue({
                    code: "custom",
                    path: ["startDate"],
                    message: "Data inicial obrigatória no período personalizado",
                })
            }
            if (!hasEnd) {
                ctx.addIssue({
                    code: "custom",
                    path: ["endDate"],
                    message: "Data final obrigatória no período personalizado",
                })
            }
            if (!hasStart || !hasEnd) {
                return
            }

            if (data.startDate! > data.endDate!) {
                ctx.addIssue({
                    code: "custom",
                    path: ["startDate"],
                    message: "A data inicial não pode ser posterior à data final",
                })
            }

            const todayStr = toLocalDateString(nowProvider())
            if (data.endDate! > todayStr) {
                ctx.addIssue({
                    code: "custom",
                    path: ["endDate"],
                    message: "A data final não pode ser futura",
                })
            }
        })
}

export const reportQuerySchema = createReportQuerySchema()
