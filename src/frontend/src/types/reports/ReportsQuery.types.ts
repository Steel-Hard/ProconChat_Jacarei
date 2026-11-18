import type ReportPeriodPreset from "@/types/reports/ReportPeriodPreset.types"

type ReportsQuery =
    | { period: Exclude<ReportPeriodPreset, "custom"> }
    | { period: "custom"; startDate: string; endDate: string }

export default ReportsQuery
