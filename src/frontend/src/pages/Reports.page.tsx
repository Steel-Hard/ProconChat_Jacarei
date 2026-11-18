import { useTranslation } from "react-i18next"
import InfoTooltip from "@/components/InfoTooltip"
import ReportsCategories from "@/components/ReportsCategories"
import ReportsConversations from "@/components/ReportsConversations"
import ReportsOutcomes from "@/components/ReportsOutcomes"
import ReportsPeriod from "@/components/ReportsPeriod"
import ReportsQuestions from "@/components/ReportsQuestions"
import useReports from "@/pages/hooks/useReports"
import css from "@/styles/pages/reports.module.css"
import sections from "@/styles/components/reportSections.module.css"

const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

function ReportsPage() {
    const { t } = useTranslation(["reports", "common"])
    const reports = useReports()
    const report = reports.report

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={sections.page}>
                <header className={sections.header}>
                    <div>
                        <h1 className={sections.title}>{t("heading")}</h1>
                        <p className={sections.subtitle}>
                            {reports.range
                                ? t(
                                      reports.range.untilNow
                                          ? "subtitle.withPeriodUntilNow"
                                          : "subtitle.withPeriod",
                                      { start: reports.range.start, end: reports.range.end }
                                  )
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

                {reports.firstLoading ? <p className={css.loading}>{t("common:loading")}</p> : null}
                {reports.failed ? (
                    <div className={css.alert}>
                        <p role="alert">{t("loadFailed")}</p>
                        <button
                            type="button"
                            className={css.retryButton}
                            onClick={() => reports.refetch()}
                        >
                            {t("retry")}
                        </button>
                    </div>
                ) : null}
                {report ? (
                    <>
                        <div className={sections.overview}>
                            <ReportsConversations conversations={report.conversations} />
                            <ReportsOutcomes
                                outcomes={report.outcomes}
                                canOpenSchedule={reports.canOpenSchedule}
                            />
                        </div>

                        <div className={sections.rankings}>
                            <ReportsCategories categories={report.topCategories} />
                            <ReportsQuestions questions={report.topQuestions} />
                        </div>

                        <section className={css.section} aria-labelledby="appointments-heading">
                            <div className={css.sectionHeader}>
                                <h2 className={css.sectionTitle} id="appointments-heading">
                                    {t("appointments.heading")}
                                </h2>
                                <InfoTooltip
                                    label={t("tooltips.appointments.label")}
                                    text={t("tooltips.appointments.text")}
                                />
                            </div>
                            <div className={css.appointmentSummary}>
                                <strong className={css.noShowRate}>
                                    {t("appointments.noShowRate", {
                                        rate: numberFormatter.format(
                                            report.appointmentsResult.noShowRate
                                        )
                                    })}
                                </strong>
                                <p className={css.muted}>
                                    {t("appointments.recordedTotal", {
                                        count: report.appointmentsResult.recordedTotal
                                    })}
                                </p>
                            </div>
                            <dl className={css.resultGrid}>
                                {(
                                    [
                                        ["attended", report.appointmentsResult.attended],
                                        ["noShow", report.appointmentsResult.noShow],
                                        ["canceled", report.appointmentsResult.canceled],
                                        ["waitingRecord", report.appointmentsResult.waitingRecord],
                                        ["upcoming", report.appointmentsResult.upcoming]
                                    ] as const
                                ).map(([key, count]) => (
                                    <div key={key}>
                                        <dt>{t(`appointments.results.${key}`)}</dt>
                                        <dd>{count}</dd>
                                    </div>
                                ))}
                                <div className={css.resultTotal}>
                                    <dt>{t("appointments.total")}</dt>
                                    <dd>{report.appointmentsResult.total}</dd>
                                </div>
                            </dl>
                        </section>
                    </>
                ) : null}
            </section>
        </>
    )
}

export default ReportsPage
