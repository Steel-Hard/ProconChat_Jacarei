import { useId } from "react"
import { useTranslation } from "react-i18next"
import ScheduleNumberField from "@/components/ScheduleNumberField"
import type MinNoticeDays from "@/types/schedule/MinNoticeDays.types"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleWindowFieldsProps = {
    windowDays: string
    minNoticeDays: MinNoticeDays
    waitAlertDays: string
    windowMessages: string[]
    waitAlertMessages: string[]
    onChangeWindowDays: (value: string) => void
    onChangeMinNoticeDays: (value: MinNoticeDays) => void
    onChangeWaitAlertDays: (value: string) => void
}

const MIN_NOTICE_DAYS: MinNoticeDays[] = [0, 1, 2, 3, 5]

function isMinNoticeDays(value: number): value is MinNoticeDays {
    return MIN_NOTICE_DAYS.some((option) => option === value)
}

function ScheduleWindowFields({
    windowDays,
    minNoticeDays,
    waitAlertDays,
    windowMessages,
    waitAlertMessages,
    onChangeWindowDays,
    onChangeMinNoticeDays,
    onChangeWaitAlertDays
}: ScheduleWindowFieldsProps) {
    const { t } = useTranslation("schedule")
    const selectId = useId()
    const helpId = useId()

    return (
        <section className={css.section}>
            <div>
                <h2 className={css.sectionTitle}>{t("window.title")}</h2>
                <p className={css.sectionDescription}>{t("window.description")}</p>
            </div>
            <div className={css.threeColumns}>
                <ScheduleNumberField
                    label={t("window.windowDays")}
                    value={windowDays}
                    min={1}
                    max={180}
                    suffix={t("window.windowSuffix")}
                    help={t("window.windowHelp")}
                    messages={windowMessages}
                    onChange={onChangeWindowDays}
                />
                <div className={css.field}>
                    <label htmlFor={selectId} className={css.label}>
                        {t("window.minNotice")}
                    </label>
                    <select
                        id={selectId}
                        className={css.select}
                        value={minNoticeDays}
                        aria-describedby={helpId}
                        onChange={(event) => {
                            const value = Number(event.target.value)

                            if (isMinNoticeDays(value)) {
                                onChangeMinNoticeDays(value)
                            }
                        }}
                    >
                        {MIN_NOTICE_DAYS.map((option) => (
                            <option key={option} value={option}>
                                {t(`window.minNoticeOptions.${option}`)}
                            </option>
                        ))}
                    </select>
                    <span id={helpId} className={css.help}>
                        {t("window.minNoticeHelp")}
                    </span>
                </div>
                <ScheduleNumberField
                    label={t("window.waitAlert")}
                    value={waitAlertDays}
                    min={1}
                    max={60}
                    suffix={t("window.waitAlertSuffix")}
                    help={t("window.waitAlertHelp")}
                    messages={waitAlertMessages}
                    onChange={onChangeWaitAlertDays}
                />
            </div>
        </section>
    )
}

export default ScheduleWindowFields
