import { useTranslation } from "react-i18next"
import InfoTooltip from "@/components/InfoTooltip"
import ReportsPeriod from "@/components/ReportsPeriod"
import useReports from "@/pages/hooks/useReports"
import type ReportOutcome from "@/types/reports/ReportOutcome.types"
import css from "@/styles/pages/reports.module.css"
import sections from "@/styles/components/reportSections.module.css"

const OUTCOMES: ReportOutcome[] = [
    "RESOLVED",
    "SCHEDULED",
    "OUT_OF_SCOPE",
    "NO_SLOT",
    "DECLINED",
    "MANAGED_APPOINTMENT",
    "ABANDONED",
    "IN_PROGRESS"
]

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
                        <section className={css.section} aria-labelledby="conversations-heading">
                            <div className={css.sectionHeader}>
                                <h2 className={css.sectionTitle} id="conversations-heading">
                                    {t("conversations.heading")}
                                </h2>
                                <InfoTooltip
                                    label={t("tooltips.conversations.label")}
                                    text={t("tooltips.conversations.text")}
                                />
                            </div>
                            <div className={css.summaryGrid}>
                                <article className={css.metric}>
                                    <span>{t("conversations.total")}</span>
                                    <strong>{report.conversations.total}</strong>
                                </article>
                                <article className={css.metric}>
                                    <span>{t("conversations.dailyAverage")}</span>
                                    <strong>
                                        {numberFormatter.format(report.conversations.dailyAverage)}
                                    </strong>
                                </article>
                                <article className={css.metric}>
                                    <span>{t("conversations.appointmentsCreated")}</span>
                                    <strong>{report.conversations.appointmentsCreated}</strong>
                                </article>
                            </div>
                        </section>

                        <section className={css.section} aria-labelledby="outcomes-heading">
                            <div className={css.sectionHeader}>
                                <h2 className={css.sectionTitle} id="outcomes-heading">
                                    {t("outcomes.heading")}
                                </h2>
                                <InfoTooltip
                                    label={t("tooltips.outcomes.label")}
                                    text={t("tooltips.outcomes.text")}
                                />
                            </div>
                            <ul className={css.outcomeList}>
                                {OUTCOMES.map((outcome) => {
                                    const item = report.outcomes.find(
                                        (candidate) => candidate.outcome === outcome
                                    )
                                    if (!item) {
                                        return null
                                    }
                                    return (
                                        <li
                                            key={outcome}
                                            className={
                                                outcome === "NO_SLOT"
                                                    ? `${css.outcome} ${css.outcomeWarning}`
                                                    : css.outcome
                                            }
                                        >
                                            <div className={css.outcomeDetails}>
                                                <span>{t(`outcomes.labels.${outcome}`)}</span>
                                                <strong>
                                                    {t("outcomes.countPercentage", {
                                                        count: item.count,
                                                        percentage: numberFormatter.format(
                                                            item.percentage
                                                        )
                                                    })}
                                                </strong>
                                            </div>
                                            <progress
                                                max={100}
                                                value={item.percentage}
                                                aria-label={t(`outcomes.labels.${outcome}`)}
                                            />
                                        </li>
                                    )
                                })}
                            </ul>
                        </section>

                        <div className={css.twoColumns}>
                            <section className={css.section} aria-labelledby="categories-heading">
                                <div className={css.sectionHeader}>
                                    <h2 className={css.sectionTitle} id="categories-heading">
                                        {t("categories.heading")}
                                    </h2>
                                    <InfoTooltip
                                        label={t("tooltips.categories.label")}
                                        text={t("tooltips.categories.text")}
                                    />
                                </div>
                                {report.topCategories.length ? (
                                    <ol className={css.rankedList}>
                                        {report.topCategories.map((category) => (
                                            <li key={category.categoryId}>
                                                <span>{category.title}</span>
                                                <strong>
                                                    {t("count.conversations", {
                                                        count: category.conversationsCount
                                                    })}
                                                </strong>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <p className={css.empty}>{t("empty.categories")}</p>
                                )}
                            </section>

                            <section className={css.section} aria-labelledby="questions-heading">
                                <div className={css.sectionHeader}>
                                    <h2 className={css.sectionTitle} id="questions-heading">
                                        {t("questions.heading")}
                                    </h2>
                                    <InfoTooltip
                                        label={t("tooltips.questions.label")}
                                        text={t("tooltips.questions.text")}
                                    />
                                </div>
                                {report.topQuestions.length ? (
                                    <ol className={css.rankedList}>
                                        {report.topQuestions.map((question) => (
                                            <li key={question.questionId}>
                                                <span>
                                                    <strong>
                                                        {question.shortTitle ?? question.question}
                                                    </strong>
                                                    <small>{question.categoryTitle}</small>
                                                </span>
                                                <strong>
                                                    {t("count.conversations", {
                                                        count: question.conversationsCount
                                                    })}
                                                </strong>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <p className={css.empty}>{t("empty.questions")}</p>
                                )}
                            </section>
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
