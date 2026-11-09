import api from "@/store/api"
import type ReportPeriodPreset from "@/types/reports/ReportPeriodPreset.types"
import type ReportsSummary from "@/types/reports/ReportsSummary.types"

type ReportsQuery =
    | { period: Exclude<ReportPeriodPreset, "custom"> }
    | { period: "custom"; startDate: string; endDate: string }

type Envelope<T> = { data: T }

const REPORTS_PATH = "/api/v1/reports"

function reportsQuery(args: ReportsQuery): string {
    const params = new URLSearchParams({ period: args.period })

    if (args.period === "custom") {
        params.set("startDate", args.startDate)
        params.set("endDate", args.endDate)
    }

    return `${REPORTS_PATH}?${params.toString()}`
}

const reportsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getReports: build.query<ReportsSummary, ReportsQuery>({
            query: reportsQuery,
            transformResponse: (response: Envelope<ReportsSummary>) => response.data
        })
    })
})

export type { ReportsQuery }
export default reportsApi
