import { useTranslation } from "react-i18next"
import InfoTooltip from "@/components/InfoTooltip"
import formatReportAverage from "@/utils/reports/formatReportAverage"
import formatReportCount from "@/utils/reports/formatReportCount"
import css from "@/styles/components/reportSections.module.css"
import type ReportsSummary from "@/types/reports/ReportsSummary.types"

type Props = { conversations: ReportsSummary["conversations"] }

function ReportsConversations({ conversations }: Props) {
    const { t } = useTranslation("reports")

    return (
        <section className={css.conversations} aria-labelledby="conversations-heading">
            <h2 className={css.conversationsLabel} id="conversations-heading">
                {t("conversations.heading")}
                <InfoTooltip
                    label={t("tooltips.conversations.label")}
                    text={t("tooltips.conversations.text")}
                />
            </h2>
            <strong className={css.conversationsTotal}>
                {formatReportCount(conversations.total)}
            </strong>
            <p className={css.conversationsLine}>
                {t(
                    conversations.appointmentsCreated === 1
                        ? "conversations.averageOne"
                        : "conversations.averageOther",
                    {
                        average: formatReportAverage(conversations.dailyAverage),
                        total: formatReportCount(conversations.appointmentsCreated)
                    }
                )}
            </p>
        </section>
    )
}

export default ReportsConversations
