import { useState } from "react"
import { useTranslation } from "react-i18next"
import InfoTooltip from "@/components/InfoTooltip"
import reportsApi from "@/store/api/reports.api"
import type ReportPeriodPreset from "@/types/reports/ReportPeriodPreset.types"
import type { ReportOutcome } from "@/types/reports/ReportsSummary.types"
import formatDate from "@/utils/formatDate"
import css from "@/styles/pages/reports.module.css"

const PRESETS: Exclude<ReportPeriodPreset, "custom">[] = [
    "7d",
    "30d",
    "90d",
    "current_month",
    "previous_month"
]

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
    const [preset, setPreset] = useState<ReportPeriodPreset>("30d")
    const [queryPreset, setQueryPreset] = useState<Exclude<ReportPeriodPreset, "custom">>("30d")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [customMaxDate, setCustomMaxDate] = useState<string | null>(null)
    const [appliedCustom, setAppliedCustom] = useState<{
        startDate: string
        endDate: string
    } | null>(null)

    const queryArg =
        preset === "custom" && appliedCustom
            ? { period: "custom" as const, ...appliedCustom }
            : { period: preset === "custom" ? queryPreset : preset }
    const query = reportsApi.useGetReportsQuery(queryArg)
    const report = query.data
    const maxCustomDate = report?.period.today ?? customMaxDate
    const customRangeValid =
        startDate !== "" &&
        endDate !== "" &&
        startDate <= endDate &&
        maxCustomDate !== null &&
        maxCustomDate !== undefined &&
        endDate <= maxCustomDate

    function selectPreset(value: ReportPeriodPreset) {
        setPreset(value)
        setAppliedCustom(null)

        if (value === "custom") {
            if (report) {
                setStartDate(report.period.startDate)
                setEndDate(report.period.endDate)
                setCustomMaxDate(report.period.today)
            }
        } else {
            setQueryPreset(value)
        }
    }

    function applyCustomRange() {
        if (customRangeValid) {
            setAppliedCustom({ startDate, endDate })
        }
    }

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <header className={css.header}>
                    <div>
                        <h1 className={css.title}>{t("heading")}</h1>
                        <p className={css.subtitle}>{t("subtitle")}</p>
                    </div>
                </header>

                <section className={css.card} aria-labelledby="report-period-heading">
                    <h2 className={css.sectionTitle} id="report-period-heading">
                        {t("period.heading")}
                    </h2>
                    <div className={css.periodOptions}>
                        {PRESETS.map((value) => (
                            <button
                                key={value}
                                type="button"
                                className={css.periodButton}
                                aria-pressed={preset === value}
                                onClick={() => selectPreset(value)}
                            >
                                {t(`period.presets.${value}`)}
                            </button>
                        ))}
                        <button
                            type="button"
                            className={css.periodButton}
                            aria-pressed={preset === "custom"}
                            disabled={report === undefined || query.isFetching}
                            onClick={() => selectPreset("custom")}
                        >
                            {t("period.presets.custom")}
                        </button>
                    </div>
                    {preset === "custom" ? (
                        <div className={css.customPeriod}>
                            <label className={css.dateField}>
                                {t("period.startDate")}
                                <input
                                    type="date"
                                    value={startDate}
                                    max={maxCustomDate ?? undefined}
                                    aria-invalid={
                                        startDate !== "" && startDate > endDate && endDate !== ""
                                    }
                                    onChange={(event) => {
                                        setStartDate(event.target.value)
                                        setAppliedCustom(null)
                                    }}
                                />
                            </label>
                            <label className={css.dateField}>
                                {t("period.endDate")}
                                <input
                                    type="date"
                                    value={endDate}
                                    max={maxCustomDate ?? undefined}
                                    aria-invalid={
                                        endDate !== "" &&
                                        ((startDate !== "" && endDate < startDate) ||
                                            (maxCustomDate !== null &&
                                                maxCustomDate !== undefined &&
                                                endDate > maxCustomDate))
                                    }
                                    onChange={(event) => {
                                        setEndDate(event.target.value)
                                        setAppliedCustom(null)
                                    }}
                                />
                            </label>
                            <button
                                type="button"
                                className={css.applyButton}
                                disabled={!customRangeValid || query.isFetching}
                                onClick={applyCustomRange}
                            >
                                {t("period.apply")}
                            </button>
                            {!customRangeValid && (startDate !== "" || endDate !== "") ? (
                                <p className={css.validation} role="alert">
                                    {t("period.invalidRange")}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </section>

                {query.isFetching ? <p className={css.loading}>{t("common:loading")}</p> : null}
                {query.isError ? (
                    <div className={css.alert}>
                        <p role="alert">{t("loadFailed")}</p>
                        <button
                            type="button"
                            className={css.retryButton}
                            onClick={() => void query.refetch()}
                        >
                            {t("retry")}
                        </button>
                    </div>
                ) : null}
                {report ? (
                    <>
                        <p className={css.selectedPeriod}>
                            {t("period.selected", {
                                start:
                                    formatDate(report.period.startDate) ?? report.period.startDate,
                                end: formatDate(report.period.endDate) ?? report.period.endDate
                            })}
                        </p>
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
