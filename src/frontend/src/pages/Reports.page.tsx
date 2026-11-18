import { useTranslation } from "react-i18next"
import ReportsAppointments from "@/components/ReportsAppointments"
import ReportsCategories from "@/components/ReportsCategories"
import ReportsConversations from "@/components/ReportsConversations"
import ReportsOutcomes from "@/components/ReportsOutcomes"
import ReportsPeriod from "@/components/ReportsPeriod"
import ReportsQuestions from "@/components/ReportsQuestions"
import useReports from "@/pages/hooks/useReports"
import css from "@/styles/components/reportSections.module.css"

function ReportsPage() {
    const { t } = useTranslation("reports")
    const reports = useReports()
    const report = reports.report
    const subtitleKey = reports.range?.untilNow
        ? "subtitle.withPeriodUntilNow"
        : "subtitle.withPeriod"

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <header className={css.header}>
                    <div>
                        <h1 className={css.title}>{t("heading")}</h1>
                        <p className={css.subtitle}>
                            {reports.range
                                ? t(subtitleKey, {
                                      start: reports.range.start,
                                      end: reports.range.end
                                  })
                                : t("subtitle.base")}
                        </p>
                    </div>
                </header>

                <ReportsPeriod
                    preset={reports.preset}
                    startDate={reports.startDate}
                    endDate={reports.endDate}
                    today={reports.today}
                    onSelect={reports.selectPreset}
                    onChangeStart={reports.changeStartDate}
                    onChangeEnd={reports.changeEndDate}
                />

                {reports.firstLoading ? (
                    <section className={css.card}>
                        <output className={css.loading}>{t("loading")}</output>
                    </section>
                ) : null}

                {reports.failed ? (
                    <div className={css.alert}>
                        <p role="alert">{t("loadFailed")}</p>
                        <button type="button" className={css.retry} onClick={reports.refetch}>
                            {t("retry")}
                        </button>
                    </div>
                ) : null}

                {report && !reports.failed ? (
                    <div
                        className={reports.refreshing ? `${css.page} ${css.refreshing}` : css.page}
                        aria-busy={reports.refreshing}
                    >
                        <div className={css.overview}>
                            <ReportsConversations conversations={report.conversations} />
                            <ReportsOutcomes
                                outcomes={report.outcomes}
                                canOpenSchedule={reports.canOpenSchedule}
                            />
                        </div>
                        <div className={css.rankings}>
                            <ReportsCategories categories={report.topCategories} />
                            <ReportsQuestions questions={report.topQuestions} />
                        </div>
                        <ReportsAppointments result={report.appointmentsResult} />
                    </div>
                ) : null}
            </section>
        </>
    )
}

export default ReportsPage
