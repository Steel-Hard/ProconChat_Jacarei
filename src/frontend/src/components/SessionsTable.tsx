import EmptyState from "@/components/EmptyState"
import Pagination from "@/components/Pagination"
import SessionOutcomeBadge from "@/components/SessionOutcomeBadge"
import useSessionsText from "@/pages/hooks/useSessionsText"
import type SessionTranslate from "@/types/sessions/SessionTranslate.types"
import type { SessionList, SessionListItem } from "@/types/sessions/Session.types"
import formatDate from "@/utils/formatDate"
import formatTime from "@/utils/formatTime"
import css from "@/styles/pages/sessions.module.css"

type SessionsTableProps = {
    data: SessionList
    searching: boolean
    onOpen: (code: string) => void
    onPage: (page: number) => void
}

function startedAt(value: string): string {
    return `${formatDate(value) ?? ""} · ${formatTime(new Date(value))}`
}

function isReturn(item: SessionListItem): boolean {
    return item.appointment !== null && item.appointment.action !== "CREATED"
}

function SessionRow({ item, onOpen }: { item: SessionListItem; onOpen: (code: string) => void }) {
    const t = useSessionsText()
    const appointment = item.appointment
    const question =
        item.question_title ??
        (appointment && isReturn(item)
            ? t("list.returnQuestion", { protocol: appointment.protocol })
            : t("list.dash"))

    return (
        <tr className={css.row} onClick={() => onOpen(item.code)}>
            <td>
                <button type="button" className={css.code} onClick={() => onOpen(item.code)}>
                    {item.code}
                </button>
                <span className={css.muted}>{startedAt(item.started_at)}</span>
            </td>
            <td>
                <SessionOutcomeBadge outcome={item.outcome} label={t(`outcomes.${item.outcome}`)} />
                {item.outcome === "IN_PROGRESS" && item.current_step ? (
                    <span className={css.step}>
                        {t("list.currentStep", { step: t(`steps.${item.current_step}`) })}
                    </span>
                ) : null}
            </td>
            <td>
                <span className={css.muted}>{item.category_name ?? t("list.dash")}</span>
                <span className={css.question}>{question}</span>
            </td>
            <td>
                {appointment ? (
                    <>
                        <span className={css.protocol}>{appointment.protocol}</span>
                        <span className={css.muted}>
                            {t(`appointment.${appointment.action ?? "CREATED"}`)}
                        </span>
                    </>
                ) : (
                    <span className={css.none}>{t("appointment.none")}</span>
                )}
            </td>
        </tr>
    )
}

function summaryOf(t: SessionTranslate, data: SessionList, searching: boolean): string {
    if (data.total === 0) {
        return t("footer.countZero")
    }

    const from = (data.page - 1) * data.limit + 1
    const to = Math.min(data.page * data.limit, data.total)
    const count = t(data.total === 1 ? "footer.countOne" : "footer.countMany", {
        from,
        to,
        total: data.total
    })

    if (searching) {
        return count
    }

    return t("footer.period", {
        count,
        from: formatDate(data.range.from) ?? "",
        to: formatDate(data.range.to) ?? ""
    })
}

function SessionsTable({ data, searching, onOpen, onPage }: SessionsTableProps) {
    const t = useSessionsText()

    return (
        <div className={css.card}>
            {data.total > 0 ? (
                <div className={css.scroll}>
                    <table className={css.table} aria-label={t("table.label")}>
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
                                <SessionRow key={item.id} item={item} onOpen={onOpen} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState
                    title={t(searching ? "empty.searchTitle" : "empty.title")}
                    description={t(searching ? "empty.searchText" : "empty.text")}
                />
            )}
            <Pagination
                label={t("footer.pagination")}
                summary={summaryOf(t, data, searching)}
                pageLabel={t("footer.page", { page: data.page, totalPages: data.totalPages })}
                previousLabel={t("footer.previous")}
                nextLabel={t("footer.next")}
                page={data.page}
                totalPages={data.totalPages}
                onPrevious={() => onPage(data.page - 1)}
                onNext={() => onPage(data.page + 1)}
            />
        </div>
    )
}

export default SessionsTable
