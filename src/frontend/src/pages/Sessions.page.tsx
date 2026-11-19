import { useTranslation } from "react-i18next"
import SessionDrawer from "@/components/SessionDrawer"
import SessionsFilters from "@/components/SessionsFilters"
import SessionsSearch from "@/components/SessionsSearch"
import SessionsTable from "@/components/SessionsTable"
import useSessions from "@/pages/hooks/useSessions"
import css from "@/styles/pages/sessions.module.css"

function SessionsPage() {
    const { t } = useTranslation(["sessions", "common"])
    const sessions = useSessions()
    const { filters, data, list } = sessions
    const searching = filters.search !== undefined

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <div className={css.header}>
                    <h1 className={css.title}>{t("heading")}</h1>
                    <p className={css.subtitle}>{t("subtitle")}</p>
                </div>

                <SessionsSearch
                    value={sessions.term}
                    searching={searching}
                    total={list.isFetching ? null : (data?.total ?? null)}
                    onChange={sessions.setTerm}
                    onClear={sessions.clearSearch}
                />

                {!searching ? (
                    <SessionsFilters
                        filters={filters}
                        data={data}
                        today={sessions.today}
                        onPeriod={sessions.selectPeriod}
                        onStart={sessions.changeStart}
                        onEnd={sessions.changeEnd}
                        onCategory={sessions.selectCategory}
                        onOutcome={sessions.selectOutcome}
                    />
                ) : null}

                {list.isLoading ? <p className={css.status}>{t("common:loading")}</p> : null}
                {list.isError ? (
                    <div className={css.status}>
                        <p role="alert">{t("loadFailed")}</p>
                        <button type="button" onClick={() => void list.refetch()}>
                            {t("retry")}
                        </button>
                    </div>
                ) : null}
                {!list.isError && data ? (
                    <SessionsTable
                        data={data}
                        searching={searching}
                        onOpen={sessions.select}
                        onPage={sessions.goToPage}
                    />
                ) : null}
            </section>

            {sessions.selectedCode ? (
                <SessionDrawer
                    detail={sessions.detail.currentData}
                    loading={sessions.detail.isFetching && !sessions.detail.currentData}
                    failed={sessions.detail.isError}
                    canOpenAppointment={sessions.canOpenAppointment}
                    onClose={sessions.close}
                    onSelect={sessions.select}
                    onOpenAppointment={sessions.openAppointment}
                />
            ) : null}
        </>
    )
}

export default SessionsPage
