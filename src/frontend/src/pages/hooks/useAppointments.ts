import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import useCompactTable from "@/hooks/useCompactTable"
import useToast from "@/hooks/useToast"
import hasPermission from "@/navigation/hasPermission"
import useAppointmentSearch from "@/pages/hooks/useAppointmentSearch"
import ROUTES from "@/routers/paths"
import appointmentsApi from "@/store/api/appointments.api"
import useAppSelector from "@/store/useAppSelector"
import type AppointmentChip from "@/types/appointments/AppointmentChip.types"
import type AppointmentChipCounts from "@/types/appointments/AppointmentChipCounts.types"
import type AppointmentList from "@/types/appointments/AppointmentList.types"
import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"
import type AppointmentListItem from "@/types/appointments/AppointmentListItem.types"
import type AppointmentListOrigin from "@/types/appointments/AppointmentListOrigin.types"
import type AppointmentPeriod from "@/types/appointments/AppointmentPeriod.types"
import type AppointmentResponsibleFilter from "@/types/appointments/AppointmentResponsibleFilter.types"
import type AppointmentRowView from "@/types/appointments/AppointmentRowView.types"
import type AppointmentSortBy from "@/types/appointments/AppointmentSortBy.types"
import type AppointmentStatusFilter from "@/types/appointments/AppointmentStatusFilter.types"
import parseAppointmentListParams from "@/utils/parseAppointmentListParams"
import appointmentActionErrorKey from "@/utils/appointmentActionErrorKey"
import APPOINTMENT_PERIODS from "@/utils/appointmentPeriods"
import APPOINTMENT_RESPONSIBLE_FILTERS from "@/utils/appointmentResponsibleFilters"
import APPOINTMENT_STATUS_FILTERS from "@/utils/appointmentStatusFilters"
import defaultSortMode from "@/utils/defaultSortMode"
import formatDayMonth from "@/utils/formatDayMonth"
import formatTime from "@/utils/formatTime"
import toAppointmentListParams from "@/utils/toAppointmentListParams"
import weekdayOf from "@/utils/weekdayOf"

type ShownList = {
    args: AppointmentListFilters
    list: AppointmentList
}

type EmptyView = {
    title: string
    description: string
    clearFilters: boolean
}

const CHIP_COUNT_KEYS: Record<AppointmentStatusFilter, keyof AppointmentChipCounts> = {
    all: "all",
    PENDING: "pending",
    CONFIRMED: "confirmed",
    ATTENDED: "attended",
    NO_SHOW: "no_show",
    CANCELED: "canceled",
    waiting_record: "waiting_record"
}

const SORT_OPTIONS = [
    "default",
    "appointment_datetime:asc",
    "appointment_datetime:desc",
    "name:asc",
    "name:desc",
    "responsible:asc",
    "responsible:desc",
    "status:asc",
    "status:desc"
] as const

type SortOption = (typeof SORT_OPTIONS)[number]
type SortOptionKey = "default" | `${AppointmentSortBy}.${"asc" | "desc"}`

function withoutOrder(filters: AppointmentListFilters): AppointmentListFilters {
    return {
        status: filters.status,
        period: filters.period,
        responsible: filters.responsible,
        page: 1
    }
}

function sameResultSet(a: AppointmentListFilters, b: AppointmentListFilters): boolean {
    return (
        a.search === b.search &&
        a.status === b.status &&
        a.period === b.period &&
        a.responsible === b.responsible
    )
}

function useAppointments() {
    const { t } = useTranslation(["appointments", "common"])
    const { showToast } = useToast()
    const navigate = useNavigate()
    const location = useLocation()
    const compact = useCompactTable()
    const account = useAppSelector((state) => state.account.current)
    const canManage = hasPermission(account, "appointments.manage")
    const [searchParams, setSearchParams] = useSearchParams()
    const filters = useMemo(() => parseAppointmentListParams(searchParams), [searchParams])
    const [claimingIds, setClaimingIds] = useState<string[]>([])
    const claimsInFlight = useRef(new Set<string>())

    const applyFilters = useCallback(
        (next: AppointmentListFilters, replace = false) => {
            setSearchParams(toAppointmentListParams(next), { replace })
        },
        [setSearchParams]
    )

    const resetOrder = useCallback(() => {
        setSearchParams(
            (current) => toAppointmentListParams(withoutOrder(parseAppointmentListParams(current))),
            { replace: true, flushSync: true }
        )
    }, [setSearchParams])

    const searchState = useAppointmentSearch(resetOrder)
    const { search, searching } = searchState
    const args = useMemo(() => ({ ...filters, search }), [filters, search])

    appointmentsApi.useGetPendingAppointmentsCountQuery(undefined, {
        skip: account === null,
        refetchOnMountOrArgChange: true
    })
    const list = appointmentsApi.useGetAppointmentsQuery(args, { refetchOnMountOrArgChange: true })
    const [updateStatus] = appointmentsApi.useUpdateAppointmentStatusMutation()
    const current = list.currentData
    const [shown, setShown] = useState<ShownList | null>(null)

    if (current !== undefined && shown?.list !== current) {
        setShown({ args, list: current })
    }

    const keepPrevious = shown !== null && sameResultSet(shown.args, args)
    const data = current ?? (keepPrevious ? shown.list : undefined)
    const error = list.isError && !list.isFetching
    const loading = !error && data === undefined

    useEffect(() => {
        if (current && current.total > 0 && filters.page > current.totalPages) {
            applyFilters({ ...filters, page: current.totalPages }, true)
        }
    }, [current, filters, applyFilters])

    const linkState: AppointmentListOrigin = useMemo(
        () => ({ from: { pathname: location.pathname, search: location.search } }),
        [location.pathname, location.search]
    )

    const detailPath = useCallback(
        (id: string) => generatePath(ROUTES.appointmentDetail, { id }),
        []
    )

    const openDetail = useCallback(
        (id: string) => {
            void navigate(detailPath(id), { state: linkState })
        },
        [navigate, detailPath, linkState]
    )

    const toRow = useCallback(
        (item: AppointmentListItem): AppointmentRowView => {
            const active = item.status === "PENDING" || item.status === "CONFIRMED"

            return {
                id: item.id,
                protocol: item.protocol,
                name: item.name,
                cpfMasked: item.cpf_masked,
                category: item.category_name,
                question: item.question_title,
                dayLabel: t("row.day", {
                    weekday: t(`common:weekdays.short.${weekdayOf(item.appointment_datetime)}`),
                    date: formatDayMonth(item.appointment_datetime)
                }),
                timeLabel: formatTime(new Date(item.appointment_datetime)),
                representative: item.by_representative,
                responsibleLabel: item.assigned_user_name ?? t("row.unassigned"),
                unassigned: item.assigned_user_name === null,
                status: item.status,
                offGrid: item.off_grid && active,
                canClaim: canManage && item.status === "PENDING",
                claiming: claimingIds.includes(item.id),
                detailPath: detailPath(item.id)
            }
        },
        [t, canManage, claimingIds, detailPath]
    )

    const rows = useMemo(() => (data ? data.items.map(toRow) : []), [data, toRow])

    const chips: AppointmentChip[] = APPOINTMENT_STATUS_FILTERS.map((value) => ({
        value,
        label: t(`chips.${value}`),
        count: list.data ? list.data.chipCounts[CHIP_COUNT_KEYS[value]] : 0
    }))

    const periodOptions = APPOINTMENT_PERIODS.map((value) => ({
        value,
        label: t(`filters.periods.${value}`)
    }))

    const responsibleOptions = APPOINTMENT_RESPONSIBLE_FILTERS.map((value) => ({
        value,
        label: t(`filters.responsibles.${value}`)
    }))

    const sortOptions = SORT_OPTIONS.map((value) => ({
        value,
        label: t(`sort.options.${value.replace(":", ".") as SortOptionKey}`)
    }))

    const sortValue: SortOption =
        filters.sortBy && filters.sortOrder ? `${filters.sortBy}:${filters.sortOrder}` : "default"

    const selectStatus = (status: AppointmentStatusFilter) =>
        applyFilters({ ...withoutOrder(filters), status })

    const selectPeriod = (period: AppointmentPeriod) =>
        applyFilters({ ...withoutOrder(filters), period })

    const selectResponsible = (responsible: AppointmentResponsibleFilter) =>
        applyFilters({ ...withoutOrder(filters), responsible })

    const sortBy = (column: AppointmentSortBy) => {
        const sortOrder = filters.sortBy === column && filters.sortOrder === "asc" ? "desc" : "asc"

        applyFilters({ ...filters, sortBy: column, sortOrder, page: 1 })
    }

    const selectSort = (value: string) => {
        const option = SORT_OPTIONS.find((candidate) => candidate === value) ?? "default"

        if (option === "default") {
            applyFilters({ ...withoutOrder(filters) })
            return
        }

        const [column, order] = option.split(":") as [AppointmentSortBy, "asc" | "desc"]
        applyFilters({ ...filters, sortBy: column, sortOrder: order, page: 1 })
    }

    const goToPage = (page: number) => applyFilters({ ...filters, page })

    const clearFilters = () => {
        searchState.clear()
        applyFilters({ status: "all", period: "all", responsible: "all", page: 1 })
    }

    const claim = async (row: AppointmentRowView) => {
        if (claimsInFlight.current.has(row.id)) {
            return
        }

        claimsInFlight.current.add(row.id)
        setClaimingIds((ids) => [...ids, row.id])
        const result = await updateStatus({ id: row.id, action: "claim" })
        claimsInFlight.current.delete(row.id)
        setClaimingIds((ids) => ids.filter((id) => id !== row.id))

        if ("data" in result) {
            showToast(t("common:appointmentActions.success.claim", { protocol: row.protocol }))
            return
        }

        showToast(t(`common:${appointmentActionErrorKey(result.error)}`))
    }

    const canOpenSingle = searching && searchState.settled && current?.total === 1

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape") {
            searchState.clear()
            return
        }

        if (event.key === "Enter" && canOpenSingle && current.items[0]) {
            openDetail(current.items[0].id)
        }
    }

    let searchHint = t("search.hint")

    if (searching) {
        searchHint = current ? t("search.results", { count: current.total }) : t("common:loading")

        if (canOpenSingle) {
            searchHint = t("search.enterToOpen", { hint: searchHint })
        }
    }

    if (searchState.partialCpf) {
        searchHint = t("search.cpfPartial", { hint: searchHint })
    }

    const unfiltered =
        filters.status === "all" && filters.period === "all" && filters.responsible === "all"

    let empty: EmptyView | null = null

    if (data && data.total === 0) {
        if (searching) {
            empty = {
                title: t("empty.notFound"),
                description: t("empty.search", { term: search }),
                clearFilters: false
            }
        } else if (unfiltered) {
            empty = {
                title: t("empty.notFound"),
                description: t("empty.none"),
                clearFilters: false
            }
        } else {
            empty = {
                title: filters.status === "PENDING" ? t("empty.noPending") : t("empty.notFound"),
                description: t("empty.filters"),
                clearFilters: true
            }
        }
    }

    let footer: string | null = null

    if (data && data.total > 0) {
        const from = (data.page - 1) * data.limit + 1
        const summary = t("footer.count", {
            from,
            to: Math.min(data.page * data.limit, data.total),
            count: data.total
        })

        footer = filters.sortBy
            ? summary
            : t("footer.withNote", {
                  summary,
                  note: t(`footer.sortNote.${defaultSortMode(filters, searching)}`)
              })
    }

    return {
        filters,
        compact,
        loading,
        error,
        retry: () => void list.refetch(),
        data,
        rows,
        empty,
        footer,
        chips,
        periodOptions,
        responsibleOptions,
        sortOptions,
        sortValue,
        linkState,
        search: searchState,
        searching,
        searchHint,
        handleSearchKeyDown,
        selectStatus,
        selectPeriod,
        selectResponsible,
        sortBy,
        selectSort,
        goToPage,
        clearFilters,
        openRow: (row: AppointmentRowView) => openDetail(row.id),
        claim: (row: AppointmentRowView) => void claim(row)
    }
}

export default useAppointments
