import { useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import EmptyState from "@/components/EmptyState"
import Pagination from "@/components/Pagination"
import sessionsApi from "@/store/api/sessions.api"
import useAppSelector from "@/store/useAppSelector"
import hasPermission from "@/navigation/hasPermission"
import type {
    SessionFilters,
    SessionOutcomeFilter,
    SessionPeriod,
    SessionTimelineItem
} from "@/types/sessions/Session.types"
import css from "@/styles/pages/sessions.module.css"

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

const PERIODS: SessionPeriod[] = [
    "all",
    "7",
    "30",
    "90",
    "current_month",
    "previous_month",
    "custom"
]

function validOutcome(value: string | null): SessionOutcomeFilter {
    return OUTCOMES.find((item) => item === value) ?? "all"
}

function validPeriod(value: string | null): SessionPeriod {
    return PERIODS.find((item) => item === value) ?? "30"
}

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(new Date(value))
}

function timelineLabel(item: SessionTimelineItem, t: (key: string) => string): string {
    const data = item.data
    switch (item.type) {
        case "STARTED":
            return "Início da conversa"
        case "CATEGORY_CHOSEN":
            return item.category_name
                ? `Categoria escolhida: ${item.category_name}`
                : "Categoria escolhida"
        case "QUESTION_CHOSEN":
            return item.question_title
                ? `Pergunta escolhida: ${item.question_title}`
                : "Pergunta escolhida"
        case "ANSWER_SENT":
            return data.llm === "USED"
                ? `Resposta entregue · ${t("detail.ai")}`
                : "Resposta entregue"
        case "RESOLVED_ANSWERED":
            return `${t("detail.resolved")} ${data.resolved === true ? t("detail.yes") : t("detail.no")}`
        case "SCHEDULE_OFFERED":
            return data.reason === "REQUIRES_IN_PERSON"
                ? t("detail.inPerson")
                : "Agendamento oferecido"
        case "NO_SLOT":
            return "Não havia horário disponível"
        case "SCHEDULE_DECLINED":
            return "O cidadão preferiu não agendar"
        case "ATTENDEE_CHOSEN":
            return data.by_representative === true ? "Escolheu representante" : "Escolheu titular"
        case "PHONE_NOTICE_SHOWN":
            return "Informado de que receberá avisos neste número"
        case "APPOINTMENT_CREATED":
            return item.appointment
                ? `Agendamento criado · ${item.appointment.protocol}`
                : "Agendamento criado"
        case "APPOINTMENT_CONSULTED":
            return "Consultou o agendamento"
        case "APPOINTMENT_RESCHEDULED":
            return "Remarcou o agendamento"
        case "APPOINTMENT_CANCELED":
            return "Cancelou o agendamento"
        case "ABANDONED":
            return `Parou em ${t(`steps.${String(data.step ?? "")}`)}`
        default:
            return item.type
    }
}

function SessionsPage() {
    const { t } = useTranslation(["sessions", "common"])
    const [searchParams, setSearchParams] = useSearchParams()
    const searchId = useId()
    const periodId = useId()
    const categoryId = useId()
    const fromId = useId()
    const toId = useId()
    const [selectedCode, setSelectedCode] = useState<string | null>(null)
    const account = useAppSelector((state) => state.account.current)

    const filters = useMemo<SessionFilters>(
        () => ({
            search: searchParams.get("search")?.trim() || undefined,
            period: validPeriod(searchParams.get("period")),
            categoryId: searchParams.get("category")
                ? Number(searchParams.get("category"))
                : undefined,
            outcome: validOutcome(searchParams.get("outcome")),
            from: searchParams.get("from") ?? undefined,
            to: searchParams.get("to") ?? undefined,
            page: Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
        }),
        [searchParams]
    )

    const apply = (next: SessionFilters, replace = false) => {
        const params = new URLSearchParams()
        if (next.search) params.set("search", next.search)
        if (!next.search) {
            params.set("period", next.period)
            if (next.categoryId) params.set("category", String(next.categoryId))
            params.set("outcome", next.outcome)
            if (next.period === "custom") {
                if (next.from) params.set("from", next.from)
                if (next.to) params.set("to", next.to)
            }
        }
        params.set("page", String(next.page))
        setSearchParams(params, { replace })
    }

    const list = sessionsApi.useGetSessionsQuery(filters, { refetchOnMountOrArgChange: true })
    const detail = sessionsApi.useGetSessionQuery(selectedCode ?? "", {
        skip: selectedCode === null
    })
    const data = list.currentData
    const canViewAppointments = hasPermission(account, "appointments.view")
    const chipKeys = OUTCOMES
    const chipCountKeys: Record<
        SessionOutcomeFilter,
        keyof NonNullable<typeof data>["chipCounts"]
    > = {
        all: "all",
        RESOLVED: "resolved",
        SCHEDULED: "scheduled",
        OUT_OF_SCOPE: "out_of_scope",
        NO_SLOT: "no_slot",
        DECLINED: "declined",
        MANAGED_APPOINTMENT: "managed_appointment",
        ABANDONED: "abandoned",
        IN_PROGRESS: "in_progress"
    }

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <div className={css.header}>
                    <h1 className={css.title}>{t("heading")}</h1>
                    <p className={css.subtitle}>{t("subtitle")}</p>
                    <p className={css.privacy}>{t("privacy")}</p>
                </div>

                <div className={css.searchArea}>
                    <form
                        className={css.searchBox}
                        onSubmit={(event) => {
                            event.preventDefault()
                            const form = new FormData(event.currentTarget)
                            const term = String(form.get("search") ?? "").trim()
                            apply({ ...filters, search: term || undefined, page: 1 })
                        }}
                    >
                        <label className={css.searchLabel} htmlFor={searchId}>
                            {t("search.label")}
                        </label>
                        <input
                            id={searchId}
                            name="search"
                            className={css.searchInput}
                            type="search"
                            defaultValue={filters.search ?? ""}
                            key={filters.search ?? ""}
                            placeholder={t("search.placeholder")}
                        />
                        {filters.search ? (
                            <button
                                type="button"
                                className={css.clear}
                                onClick={() => apply({ ...filters, search: undefined, page: 1 })}
                            >
                                {t("search.clear")}
                            </button>
                        ) : null}
                    </form>
                    <p className={css.hint}>{t("search.hint")}</p>
                </div>

                {!filters.search ? (
                    <>
                        <div className={css.chips} aria-label={t("chips.label")}>
                            {chipKeys.map((outcome) => (
                                <button
                                    type="button"
                                    key={outcome}
                                    className={`${css.chip} ${filters.outcome === outcome ? css.active : ""}`}
                                    onClick={() => apply({ ...filters, outcome, page: 1 })}
                                >
                                    {t(`chips.${outcome}`)}
                                    {data ? (
                                        <span>{data.chipCounts[chipCountKeys[outcome]]}</span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                        <div className={css.filters}>
                            <label htmlFor={periodId}>
                                {t("filters.period")}
                                <select
                                    id={periodId}
                                    value={filters.period}
                                    onChange={(event) =>
                                        apply({
                                            ...filters,
                                            period: event.target.value as SessionPeriod,
                                            page: 1
                                        })
                                    }
                                >
                                    {PERIODS.map((period) => (
                                        <option key={period} value={period}>
                                            {t(`filters.periods.${period}`)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label htmlFor={categoryId}>
                                {t("filters.category")}
                                <select
                                    id={categoryId}
                                    value={filters.categoryId ?? ""}
                                    onChange={(event) =>
                                        apply({
                                            ...filters,
                                            categoryId: event.target.value
                                                ? Number(event.target.value)
                                                : undefined,
                                            page: 1
                                        })
                                    }
                                >
                                    <option value="">{t("filters.categories.all")}</option>
                                    {data?.categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {filters.period === "custom" ? (
                                <>
                                    <label htmlFor={fromId}>
                                        {t("filters.from")}
                                        <input
                                            id={fromId}
                                            type="date"
                                            value={filters.from ?? ""}
                                            onChange={(event) =>
                                                apply({
                                                    ...filters,
                                                    from: event.target.value,
                                                    page: 1
                                                })
                                            }
                                        />
                                    </label>
                                    <label htmlFor={toId}>
                                        {t("filters.to")}
                                        <input
                                            id={toId}
                                            type="date"
                                            value={filters.to ?? ""}
                                            onChange={(event) =>
                                                apply({
                                                    ...filters,
                                                    to: event.target.value,
                                                    page: 1
                                                })
                                            }
                                        />
                                    </label>
                                </>
                            ) : null}
                        </div>
                    </>
                ) : null}

                <div className={css.card}>
                    {list.isLoading ? <p className={css.status}>{t("common:loading")}</p> : null}
                    {list.isError ? (
                        <div className={css.status}>
                            <p role="alert">{t("loadFailed")}</p>
                            <button type="button" onClick={() => void list.refetch()}>
                                {t("retry")}
                            </button>
                        </div>
                    ) : null}
                    {!list.isError && data && data.total === 0 ? (
                        <EmptyState
                            title={t("empty.title")}
                            description={t("empty.description")}
                            action={{
                                label: t("empty.clear"),
                                onClick: () =>
                                    apply({
                                        search: undefined,
                                        period: "30",
                                        outcome: "all",
                                        page: 1
                                    })
                            }}
                        />
                    ) : null}
                    {!list.isError && data && data.total > 0 ? (
                        <>
                            <div className={css.scroll}>
                                <table className={css.table}>
                                    <thead>
                                        <tr>
                                            <th>{t("table.code")}</th>
                                            <th>{t("table.outcome")}</th>
                                            <th>{t("table.category")}</th>
                                            <th>{t("table.appointment")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((item) => (
                                            <tr
                                                key={item.id}
                                                onClick={() => setSelectedCode(item.code)}
                                            >
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={css.code}
                                                        onClick={() => setSelectedCode(item.code)}
                                                    >
                                                        {item.code.slice(0, 8)}
                                                    </button>
                                                    <span className={css.date}>
                                                        {formatDateTime(item.started_at)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <strong>{t(`outcomes.${item.outcome}`)}</strong>
                                                    {item.outcome === "IN_PROGRESS" &&
                                                    item.current_step ? (
                                                        <span className={css.step}>
                                                            {t(`steps.${item.current_step}`, {
                                                                defaultValue: item.current_step
                                                            })}
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td>
                                                    <span>
                                                        {item.category_name ?? t("detail.unknown")}
                                                    </span>
                                                    {item.question_title ? (
                                                        <small>{item.question_title}</small>
                                                    ) : null}
                                                </td>
                                                <td>
                                                    {item.appointment ? (
                                                        <>
                                                            {canViewAppointments ? (
                                                                <a
                                                                    href={`/agendamentos/${item.appointment.id}`}
                                                                    onClick={(event) =>
                                                                        event.stopPropagation()
                                                                    }
                                                                >
                                                                    {item.appointment.protocol}
                                                                </a>
                                                            ) : (
                                                                <span>
                                                                    {item.appointment.protocol}
                                                                </span>
                                                            )}
                                                            <small>
                                                                {t(
                                                                    `appointment.${item.appointment.action ?? "none"}`
                                                                )}
                                                            </small>
                                                        </>
                                                    ) : (
                                                        t("appointment.none")
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                label={t("footer.pagination")}
                                summary=""
                                pageLabel={t("footer.page", {
                                    page: data.page,
                                    totalPages: data.totalPages
                                })}
                                previousLabel={t("footer.previous")}
                                nextLabel={t("footer.next")}
                                page={data.page}
                                totalPages={data.totalPages}
                                onPrevious={() => apply({ ...filters, page: data.page - 1 })}
                                onNext={() => apply({ ...filters, page: data.page + 1 })}
                            />
                        </>
                    ) : null}
                </div>
            </section>

            {selectedCode ? (
                <div
                    className={css.overlay}
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setSelectedCode(null)
                    }}
                >
                    <dialog open className={css.dialog} aria-label={t("detail.title")}>
                        <div className={css.dialogHeader}>
                            <h2>{t("detail.title")}</h2>
                            <button type="button" onClick={() => setSelectedCode(null)}>
                                {t("detail.close")}
                            </button>
                        </div>
                        {detail.isLoading ? (
                            <p className={css.status}>{t("common:loading")}</p>
                        ) : null}
                        {detail.isError ? (
                            <p className={css.status} role="alert">
                                {t("loadFailed")}
                            </p>
                        ) : null}
                        {detail.data ? (
                            <div className={css.dialogBody}>
                                <div className={css.detailFacts}>
                                    <div>
                                        <span>{t("detail.code")}</span>
                                        <strong>{detail.data.code.slice(0, 8)}</strong>
                                    </div>
                                    <div>
                                        <span>{t("detail.startedAt")}</span>
                                        <strong>{formatDateTime(detail.data.started_at)}</strong>
                                    </div>
                                    <div>
                                        <span>{t("detail.outcome")}</span>
                                        <strong>{t(`outcomes.${detail.data.outcome}`)}</strong>
                                    </div>
                                </div>
                                <h3>{t("detail.timeline")}</h3>
                                <ol className={css.timeline}>
                                    {detail.data.timeline.map((item) => (
                                        <li key={item.id}>
                                            <time>{formatDateTime(item.created_at)}</time>
                                            <p>
                                                {timelineLabel(
                                                    item,
                                                    (key) => t(key as never) as string
                                                )}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                                {detail.data.appointment ? (
                                    <p>
                                        <span>{t("detail.appointment")}</span>
                                        {canViewAppointments ? (
                                            <a
                                                className={css.inlineLink}
                                                href={`/agendamentos/${detail.data.appointment.id}`}
                                            >
                                                {detail.data.appointment.protocol}
                                            </a>
                                        ) : (
                                            <span className={css.inlineLink}>
                                                {detail.data.appointment.protocol}
                                            </span>
                                        )}
                                    </p>
                                ) : null}
                                <h3>{t("detail.others")}</h3>
                                <p className={css.othersHint}>
                                    {detail.data.anonymized
                                        ? t("detail.anonymizedEmpty")
                                        : t("detail.anonymized")}
                                </p>
                                {detail.data.other_sessions.length ? (
                                    <ul className={css.otherList}>
                                        {detail.data.other_sessions.map((item) => (
                                            <li key={item.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCode(item.code)}
                                                >
                                                    {t("detail.sessionSummary", {
                                                        code: item.code.slice(0, 8),
                                                        date: formatDateTime(item.started_at),
                                                        outcome: t(`outcomes.${item.outcome}`)
                                                    })}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className={css.emptyOthers}>{t("detail.othersEmpty")}</p>
                                )}
                                <p className={css.noText}>{t("detail.noText")}</p>
                            </div>
                        ) : null}
                    </dialog>
                </div>
            ) : null}
        </>
    )
}

export default SessionsPage
