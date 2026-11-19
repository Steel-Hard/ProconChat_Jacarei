import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import hasPermission from "@/navigation/hasPermission"
import ROUTES from "@/routers/paths"
import sessionsApi from "@/store/api/sessions.api"
import useAppSelector from "@/store/useAppSelector"
import normalizeCustomRange from "@/utils/reports/normalizeCustomRange"
import todayInSaoPaulo from "@/utils/schedule/todayInSaoPaulo"
import type {
    SessionFilters,
    SessionOutcomeFilter,
    SessionPeriod
} from "@/types/sessions/Session.types"

const OUTCOMES: SessionOutcomeFilter[] = [
    "all",
    "RESOLVED",
    "SCHEDULED",
    "OUT_OF_SCOPE",
    "NO_SLOT",
    "DECLINED",
    "MANAGED_APPOINTMENT",
    "ABANDONED",
    "IN_PROGRESS"
]

const PERIODS: SessionPeriod[] = ["7", "30", "90", "current_month", "previous_month", "custom"]

const MIN_SEARCH_LENGTH = 2
const SEARCH_DELAY_MS = 300

function validOutcome(value: string | null): SessionOutcomeFilter {
    return OUTCOMES.find((item) => item === value) ?? "all"
}

function validPeriod(value: string | null): SessionPeriod {
    return PERIODS.find((item) => item === value) ?? "30"
}

function validCategory(value: string | null): number | undefined {
    const id = Number(value)

    return Number.isInteger(id) && id > 0 ? id : undefined
}

function useSessions() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const account = useAppSelector((state) => state.account.current)
    const [selectedCode, setSelectedCode] = useState<string | null>(null)

    const filters = useMemo<SessionFilters>(() => {
        const search = searchParams.get("search")?.trim() ?? ""

        return {
            search: search.length >= MIN_SEARCH_LENGTH ? search : undefined,
            period: validPeriod(searchParams.get("period")),
            categoryId: validCategory(searchParams.get("category")),
            outcome: validOutcome(searchParams.get("outcome")),
            from: searchParams.get("from") ?? undefined,
            to: searchParams.get("to") ?? undefined,
            page: Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
        }
    }, [searchParams])

    const [term, setTerm] = useState(filters.search ?? "")

    function apply(next: SessionFilters) {
        const params = new URLSearchParams()

        if (next.search) {
            params.set("search", next.search)
        } else {
            params.set("period", next.period)
            if (next.categoryId) params.set("category", String(next.categoryId))
            params.set("outcome", next.outcome)
            if (next.period === "custom") {
                if (next.from) params.set("from", next.from)
                if (next.to) params.set("to", next.to)
            }
        }

        params.set("page", String(next.page))
        setSearchParams(params, { replace: true })
    }

    useEffect(() => {
        const trimmed = term.trim()
        const wanted = trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : undefined

        if (wanted === filters.search) {
            return undefined
        }

        const timer = setTimeout(
            () => apply({ ...filters, search: wanted, page: 1 }),
            SEARCH_DELAY_MS
        )

        return () => clearTimeout(timer)
    })

    const list = sessionsApi.useGetSessionsQuery(filters, { refetchOnMountOrArgChange: true })
    const detail = sessionsApi.useGetSessionQuery(selectedCode ?? "", {
        skip: selectedCode === null
    })
    const data = list.data
    const today = todayInSaoPaulo()

    function selectPeriod(period: SessionPeriod) {
        if (period === "custom") {
            apply({
                ...filters,
                period,
                from: filters.from ?? data?.range.from,
                to: filters.to ?? data?.range.to,
                page: 1
            })

            return
        }

        apply({ ...filters, period, from: undefined, to: undefined, page: 1 })
    }

    function changeRange(start: string, end: string) {
        const range = normalizeCustomRange(start, end, today)

        if (range) {
            apply({
                ...filters,
                period: "custom",
                from: range.startDate,
                to: range.endDate,
                page: 1
            })
        }
    }

    function clearSearch() {
        setTerm("")
        apply({ ...filters, search: undefined, page: 1 })
    }

    return {
        filters,
        data,
        list,
        detail,
        term,
        setTerm,
        clearSearch,
        today,
        selectedCode,
        select: setSelectedCode,
        close: () => setSelectedCode(null),
        selectPeriod,
        selectOutcome: (outcome: SessionOutcomeFilter) => apply({ ...filters, outcome, page: 1 }),
        selectCategory: (categoryId: number | undefined) =>
            apply({ ...filters, categoryId, page: 1 }),
        changeStart: (value: string) => changeRange(value, filters.to ?? data?.range.to ?? today),
        changeEnd: (value: string) => changeRange(filters.from ?? data?.range.from ?? today, value),
        goToPage: (page: number) => apply({ ...filters, page }),
        canOpenAppointment: hasPermission(account, "appointments.view"),
        openAppointment: (id: string) => void navigate(`${ROUTES.appointments}/${id}`)
    }
}

export default useSessions
