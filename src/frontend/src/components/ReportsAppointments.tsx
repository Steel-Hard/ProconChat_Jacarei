import { useTranslation } from "react-i18next"
import InfoTooltip from "@/components/InfoTooltip"
import APPOINTMENT_STATUS from "@/status/appointmentStatusStyles"
import formatReportCount from "@/utils/reports/formatReportCount"
import formatReportPercent from "@/utils/reports/formatReportPercent"
import css from "@/styles/components/reportSections.module.css"
import type ReportsSummary from "@/types/reports/ReportsSummary.types"

type Result = ReportsSummary["appointmentsResult"]
type RowKey = "attended" | "noShow" | "canceled" | "waitingRecord" | "upcoming"

const ROWS: { key: RowKey; style: { background: string; color: string } | null }[] = [
    { key: "attended", style: pillOf("ATTENDED") },
    { key: "noShow", style: pillOf("NO_SHOW") },
    { key: "canceled", style: pillOf("CANCELED") },
    { key: "waitingRecord", style: null },
    { key: "upcoming", style: pillOf("CONFIRMED") }
]

function pillOf(status: "ATTENDED" | "NO_SHOW" | "CANCELED" | "CONFIRMED") {
    return { background: APPOINTMENT_STATUS[status].bg, color: APPOINTMENT_STATUS[status].fg }
}

type Props = { result: Result }

function ReportsAppointments({ result }: Props) {
    const { t } = useTranslation("reports")
    const noShow = APPOINTMENT_STATUS.NO_SHOW

    return (
        <section className={css.card} aria-labelledby="appointments-heading">
            <h2 className={css.cardTitle} id="appointments-heading">
                {t("appointments.heading")}
                <InfoTooltip
                    label={t("tooltips.appointments.label")}
                    text={t("tooltips.appointments.text")}
                />
            </h2>
            <div className={css.resultGrid}>
                <div
                    className={css.rateCard}
                    style={{ background: noShow.bg, borderColor: noShow.border }}
                >
                    <p className={css.rateTitle} style={{ color: noShow.fg }}>
                        {t("appointments.noShowRateLabel")}
                        <InfoTooltip
                            label={t("tooltips.noShowRate.label")}
                            text={t("tooltips.noShowRate.text")}
                        />
                    </p>
                    <strong className={css.rateValue}>
                        {t("appointments.noShowRate", {
                            rate: formatReportPercent(result.noShowRate)
                        })}
                    </strong>
                    <p className={css.rateDetail} style={{ color: noShow.fg }}>
                        {t("appointments.noShowDetail", {
                            noShow: formatReportCount(result.noShow),
                            recorded: formatReportCount(result.attended + result.noShow)
                        })}
                    </p>
                </div>
                <div>
                    <ul className={css.resultList}>
                        {ROWS.map(({ key, style }) => {
                            const count = result[key]
                            const percent = result.total === 0 ? 0 : (count / result.total) * 100

                            return (
                                <li key={key} className={css.resultRow}>
                                    <span
                                        className={
                                            style ? css.pill : `${css.pill} ${css.pillWaiting}`
                                        }
                                        style={style ?? undefined}
                                    >
                                        {t(`appointments.results.${key}`)}
                                    </span>
                                    <span className={css.resultValue}>
                                        <b>{formatReportCount(count)}</b>
                                        <span>
                                            {t("appointments.rowValue", {
                                                percent: formatReportPercent(percent)
                                            })}
                                        </span>
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                    <div className={css.resultTotal}>
                        <span>{t("appointments.total")}</span>
                        <b>{formatReportCount(result.total)}</b>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ReportsAppointments
