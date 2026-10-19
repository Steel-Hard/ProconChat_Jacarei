import { useId } from "react"
import { useTranslation } from "react-i18next"
import AppointmentListFilters from "@/components/AppointmentListFilters"
import AppointmentSortSelect from "@/components/AppointmentSortSelect"
import AppointmentStatusChips from "@/components/AppointmentStatusChips"
import AppointmentTable from "@/components/AppointmentTable"
import EmptyState from "@/components/EmptyState"
import Pagination from "@/components/Pagination"
import useAppointments from "@/pages/hooks/useAppointments"
import css from "@/styles/pages/appointments.module.css"

function AppointmentsPage() {
    const { t } = useTranslation(["appointments", "common"])
    const page = useAppointments()
    const searchId = useId()
    const hintId = useId()
    const { data, filters } = page
    const tableTexts = {
        label: t("table.label"),
        columns: {
            protocol: t("table.columns.protocol"),
            holder: t("table.columns.holder"),
            category: t("table.columns.category"),
            datetime: t("table.columns.datetime"),
            representative: t("table.columns.representative"),
            responsible: t("table.columns.responsible"),
            status: t("table.columns.status"),
            compactDatetime: t("table.columns.compactDatetime"),
            actions: t("table.columns.actions")
        },
        arrows: { asc: t("table.arrows.asc"), desc: t("table.arrows.desc") },
        row: {
            yes: t("row.yes"),
            no: t("row.no"),
            offGrid: t("row.offGrid"),
            byRepresentative: t("row.byRepresentative"),
            claim: t("row.claim"),
            separator: t("row.separator")
        }
    }

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <div className={css.header}>
                    <h1 className={css.title}>{t("heading")}</h1>
                    <p className={css.subtitle}>{t("subtitle")}</p>
                </div>
                <div className={css.searchArea}>
                    <div className={css.searchBox}>
                        <label htmlFor={searchId} className={css.searchLabel}>
                            {t("search.label")}
                        </label>
                        <input
                            id={searchId}
                            type="search"
                            className={css.searchInput}
                            placeholder={t("search.placeholder")}
                            autoComplete="off"
                            aria-describedby={hintId}
                            value={page.search.term}
                            onChange={(event) => page.search.changeTerm(event.target.value)}
                            onKeyDown={page.handleSearchKeyDown}
                        />
                        {page.search.term !== "" ? (
                            <button type="button" className={css.clear} onClick={page.search.clear}>
                                {t("search.clear")}
                            </button>
                        ) : null}
                    </div>
                    <p id={hintId} className={css.hint}>
                        {page.searchHint}
                    </p>
                </div>
                {page.searching ? null : (
                    <div className={css.filters}>
                        <AppointmentStatusChips
                            label={t("chips.label")}
                            chips={page.chips}
                            active={filters.status}
                            onSelect={page.selectStatus}
                        />
                        <AppointmentListFilters
                            periodLabel={t("filters.period")}
                            responsibleLabel={t("filters.responsible")}
                            period={filters.period}
                            responsible={filters.responsible}
                            periodOptions={page.periodOptions}
                            responsibleOptions={page.responsibleOptions}
                            onPeriodChange={page.selectPeriod}
                            onResponsibleChange={page.selectResponsible}
                        />
                    </div>
                )}
                <div className={css.card}>
                    {page.loading ? <p className={css.status}>{t("common:loading")}</p> : null}
                    {page.error ? (
                        <div className={css.status}>
                            <p role="alert" className={css.alert}>
                                {t("loadFailed")}
                            </p>
                            <button type="button" className={css.retry} onClick={page.retry}>
                                {t("retry")}
                            </button>
                        </div>
                    ) : null}
                    {!page.error && page.empty ? (
                        <EmptyState
                            title={page.empty.title}
                            description={page.empty.description}
                            action={
                                page.empty.clearFilters
                                    ? { label: t("empty.clearFilters"), onClick: page.clearFilters }
                                    : undefined
                            }
                        />
                    ) : null}
                    {!page.error && data && data.total > 0 ? (
                        <>
                            {page.compact ? (
                                <AppointmentSortSelect
                                    label={t("sort.label")}
                                    options={page.sortOptions}
                                    value={page.sortValue}
                                    onChange={page.selectSort}
                                />
                            ) : null}
                            <div className={css.scroll}>
                                <AppointmentTable
                                    rows={page.rows}
                                    compact={page.compact}
                                    texts={tableTexts}
                                    sortBy={filters.sortBy}
                                    sortOrder={filters.sortOrder}
                                    linkState={page.linkState}
                                    onSort={page.sortBy}
                                    onOpen={page.openRow}
                                    onClaim={page.claim}
                                />
                            </div>
                            <Pagination
                                label={t("footer.pagination")}
                                summary={page.footer ?? ""}
                                pageLabel={t("footer.page", {
                                    page: data.page,
                                    totalPages: data.totalPages
                                })}
                                previousLabel={t("footer.previous")}
                                nextLabel={t("footer.next")}
                                page={data.page}
                                totalPages={data.totalPages}
                                onPrevious={() => page.goToPage(data.page - 1)}
                                onNext={() => page.goToPage(data.page + 1)}
                            />
                        </>
                    ) : null}
                </div>
            </section>
        </>
    )
}

export default AppointmentsPage
