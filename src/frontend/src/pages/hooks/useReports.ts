import { useState } from "react"
import canAccess from "@/navigation/canAccess"
import NAV_ITEMS_READY from "@/navigation/navItemsReady"
import reportsApi from "@/store/api/reports.api"
import useAppSelector from "@/store/useAppSelector"
import normalizeCustomRange from "@/utils/reports/normalizeCustomRange"
import reportPeriodRange from "@/utils/reports/reportPeriodRange"
import todayInSaoPaulo from "@/utils/schedule/todayInSaoPaulo"
import type ReportPeriodPreset from "@/types/reports/ReportPeriodPreset.types"
import type ReportsQuery from "@/types/reports/ReportsQuery.types"

const DEFAULT_QUERY: ReportsQuery = { period: "30d" }

function useReports() {
    const account = useAppSelector((state) => state.account.current)
    const [preset, setPreset] = useState<ReportPeriodPreset>("30d")
    const [arg, setArg] = useState<ReportsQuery>(DEFAULT_QUERY)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const query = reportsApi.useGetReportsQuery(arg)
    const report = query.data
    const today = report?.period.today ?? todayInSaoPaulo()

    function selectPreset(value: ReportPeriodPreset) {
        setPreset(value)

        if (value === "custom") {
            if (report) {
                setStartDate(report.period.startDate)
                setEndDate(report.period.endDate)
            }

            return
        }

        setArg({ period: value })
    }

    function applyRange(start: string, end: string) {
        const range = normalizeCustomRange(start, end, today)

        if (range) {
            setArg({ period: "custom", ...range })
        }
    }

    function changeStartDate(value: string) {
        setStartDate(value)
        applyRange(value, endDate)
    }

    function changeEndDate(value: string) {
        setEndDate(value)
        applyRange(startDate, value)
    }

    return {
        report,
        firstLoading: report === undefined && query.isFetching,
        refreshing: report !== undefined && query.isFetching,
        failed: query.isError && !query.isFetching,
        refetch: () => void query.refetch(),
        preset,
        selectPreset,
        startDate,
        endDate,
        changeStartDate,
        changeEndDate,
        today,
        range: report
            ? reportPeriodRange(report.period.startDate, report.period.endDate, report.period.today)
            : null,
        canOpenSchedule: canAccess(account, "schedule") && NAV_ITEMS_READY.schedule
    }
}

export default useReports
