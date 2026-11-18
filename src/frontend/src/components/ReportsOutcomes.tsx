import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import InfoTooltip from "@/components/InfoTooltip"
import ROUTES from "@/routers/paths"
import CONVERSATION_OUTCOME from "@/status/conversationOutcomeStyles"
import formatReportCount from "@/utils/reports/formatReportCount"
import formatReportPercent from "@/utils/reports/formatReportPercent"
import css from "@/styles/components/reportSections.module.css"
import type ReportOutcome from "@/types/reports/ReportOutcome.types"
import type ReportsSummary from "@/types/reports/ReportsSummary.types"

const ORDER: ReportOutcome[] = [
    "RESOLVED",
    "SCHEDULED",
    "OUT_OF_SCOPE",
    "NO_SLOT",
    "DECLINED",
    "MANAGED_APPOINTMENT",
    "ABANDONED",
    "IN_PROGRESS"
]

type Props = {
    outcomes: ReportsSummary["outcomes"]
    canOpenSchedule: boolean
}

function ReportsOutcomes({ outcomes, canOpenSchedule }: Props) {
    const { t } = useTranslation("reports")
    const { t: tc } = useTranslation("common")
    const items = ORDER.flatMap((outcome) => {
        const item = outcomes.find((candidate) => candidate.outcome === outcome)

        return item ? [item] : []
    })

    return (
        <section className={css.card} aria-labelledby="outcomes-heading">
            <h2 className={css.cardTitle} id="outcomes-heading">
                {t("outcomes.heading")}
                <InfoTooltip
                    label={t("tooltips.outcomes.label")}
                    text={t("tooltips.outcomes.text")}
                />
            </h2>
            <div className={css.outcomeBar} aria-hidden="true" data-testid="outcome-bar">
                {items.map((item) => (
                    <span
                        key={item.outcome}
                        title={`${tc(`status.outcome.${item.outcome}`)}: ${t("outcomes.percent", { value: formatReportPercent(item.percentage) })}`}
                        style={{
                            width: `${item.percentage}%`,
                            background: CONVERSATION_OUTCOME[item.outcome].chart
                        }}
                    />
                ))}
            </div>
            <ul className={css.outcomeLegend} aria-labelledby="outcomes-heading">
                {items.map((item) => {
                    const label = tc(`status.outcome.${item.outcome}`)
                    const highlight = item.outcome === "NO_SLOT"

                    return (
                        <li
                            key={item.outcome}
                            className={
                                highlight ? `${css.outcome} ${css.outcomeHighlight}` : css.outcome
                            }
                        >
                            <span
                                className={css.swatch}
                                style={{ background: CONVERSATION_OUTCOME[item.outcome].chart }}
                            />
                            <div className={css.outcomeBody}>
                                <span className={css.outcomeName}>
                                    {label}
                                    <InfoTooltip
                                        label={t("outcomes.definitionLabel", { label })}
                                        text={t(`outcomes.definitions.${item.outcome}`)}
                                    />
                                </span>
                                {highlight ? (
                                    <>
                                        <span className={css.outcomeHint}>
                                            {t("outcomes.noSlotHint")}
                                        </span>
                                        {canOpenSchedule ? (
                                            <Link className={css.outcomeLink} to={ROUTES.schedule}>
                                                {t("outcomes.scheduleLink")}
                                            </Link>
                                        ) : null}
                                    </>
                                ) : null}
                            </div>
                            <div className={css.outcomeValue}>
                                <b>
                                    {t("outcomes.percent", {
                                        value: formatReportPercent(item.percentage)
                                    })}
                                </b>
                                <span>
                                    {t(
                                        item.count === 1
                                            ? "count.conversationsOne"
                                            : "count.conversationsOther",
                                        {
                                            formatted: formatReportCount(item.count)
                                        }
                                    )}
                                </span>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}

export default ReportsOutcomes
