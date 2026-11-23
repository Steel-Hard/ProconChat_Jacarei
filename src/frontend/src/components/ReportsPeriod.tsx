import { useTranslation } from "react-i18next"
import type ReportPeriodPreset from "@/types/reports/ReportPeriodPreset.types"
import css from "@/styles/components/reportSections.module.css"

const PRESETS: ReportPeriodPreset[] = [
    "7d",
    "30d",
    "90d",
    "current_month",
    "previous_month",
    "custom"
]

type Props = {
    preset: ReportPeriodPreset
    startDate: string
    endDate: string
    today: string
    onSelect: (value: ReportPeriodPreset) => void
    onChangeStart: (value: string) => void
    onChangeEnd: (value: string) => void
}

function ReportsPeriod({
    preset,
    startDate,
    endDate,
    today,
    onSelect,
    onChangeStart,
    onChangeEnd
}: Props) {
    const { t } = useTranslation("reports")

    return (
        <div className={css.periodRow}>
            <fieldset className={css.chips} aria-label={t("period.heading")}>
                {PRESETS.map((value) => (
                    <button
                        key={value}
                        type="button"
                        className={css.chip}
                        aria-pressed={preset === value}
                        onClick={() => onSelect(value)}
                    >
                        {t(`period.presets.${value}`)}
                    </button>
                ))}
            </fieldset>
            {preset === "custom" ? (
                <div className={css.customPeriod}>
                    <label className={css.dateField}>
                        {t("period.from")}
                        <input
                            type="date"
                            className={css.dateInput}
                            value={startDate}
                            max={today}
                            onChange={(event) => onChangeStart(event.target.value)}
                        />
                    </label>
                    <label className={css.dateField}>
                        {t("period.until")}
                        <input
                            type="date"
                            className={css.dateInput}
                            value={endDate}
                            max={today}
                            onChange={(event) => onChangeEnd(event.target.value)}
                        />
                    </label>
                </div>
            ) : null}
        </div>
    )
}

export default ReportsPeriod
