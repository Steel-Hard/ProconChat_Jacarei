import { z } from "zod";

const outcomes = [
  "all",
  "IN_PROGRESS",
  "RESOLVED",
  "SCHEDULED",
  "OUT_OF_SCOPE",
  "NO_SLOT",
  "DECLINED",
  "MANAGED_APPOINTMENT",
  "ABANDONED",
] as const;

export const listSessionsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
  period: z
    .enum(["all", "7", "30", "90", "current_month", "previous_month", "custom"])
    .default("30"),
  category: z.coerce.number().int().positive().optional(),
  outcome: z.enum(outcomes).default("all"),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

export const sessionCodeParamSchema = z.object({
  code: z.string().trim().min(1).max(64),
});
