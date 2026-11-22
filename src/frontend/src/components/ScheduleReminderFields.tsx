import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import ConfirmDialog from "@/components/ConfirmDialog"
import ScheduleReminderMeta from "@/components/ScheduleReminderMeta"
import type ReminderHours from "@/types/schedule/ReminderHours.types"
import css from "@/styles/components/scheduleForm.module.css"

type ScheduleReminderFieldsProps = {
    enabled: boolean
    hours: ReminderHours
    address: string
    complement: string
    isAdmin: boolean
    onToggle: () => void
    onChangeHours: (value: ReminderHours) => void
}

const REMINDER_HOURS: ReminderHours[] = [2, 6, 12, 24, 48]

function isReminderHours(value: number): value is ReminderHours {
    return REMINDER_HOURS.some((option) => option === value)
}

function ScheduleReminderFields({
    enabled,
    hours,
    address,
    complement,
    isAdmin,
    onToggle,
    onChangeHours
}: ScheduleReminderFieldsProps) {
    const { t } = useTranslation("schedule")
    const hoursId = useId()
    const titleId = useId()
    const [confirming, setConfirming] = useState(false)
    const dialogKey = enabled ? "off" : "on"
    const trimmedAddress = address.trim()
    const trimmedComplement = complement.trim()
    const unitAddress =
        trimmedAddress === ""
            ? t("reminder.addressMissing")
            : trimmedComplement === ""
              ? trimmedAddress
              : t("reminder.addressWithComplement", {
                    address: trimmedAddress,
                    complement: trimmedComplement
                })

    return (
        <section className={css.section}>
            <div className={css.reminderHeader}>
                <div className={css.reminderText}>
                    <h2 className={css.sectionTitle} id={titleId}>
                        {t("reminder.title")}
                    </h2>
                    <p className={css.sectionDescription}>{t("reminder.description")}</p>
                </div>
                <label className={css.toggle}>
                    <input
                        type="checkbox"
                        className={css.checkbox}
                        checked={enabled}
                        aria-labelledby={titleId}
                        onChange={() => setConfirming(true)}
                    />
                    {enabled ? t("reminder.on") : t("reminder.off")}
                </label>
            </div>
            {enabled ? (
                <>
                    <div className={css.inline}>
                        <label htmlFor={hoursId} className={css.inlineLabel}>
                            {t("reminder.hoursBefore")}
                        </label>
                        <select
                            id={hoursId}
                            className={css.select}
                            value={hours}
                            onChange={(event) => {
                                const value = Number(event.target.value)

                                if (isReminderHours(value)) {
                                    onChangeHours(value)
                                }
                            }}
                        >
                            {REMINDER_HOURS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <span className={css.suffix}>{t("reminder.hoursSuffix")}</span>
                    </div>
                    <div className={css.reminderPreview}>
                        <div className={css.reminderPreviewHeader}>
                            <span className={css.label}>{t("reminder.previewTitle")}</span>
                            <span className={css.fixed}>{t("reminder.fixed")}</span>
                        </div>
                        <p className={css.message}>
                            {t("reminder.message", { address: unitAddress })}
                        </p>
                        <p className={css.help}>{t("reminder.note")}</p>
                    </div>
                </>
            ) : null}
            <p className={css.help}>{t("reminder.cost")}</p>
            <p className={css.help}>{t("reminder.templateRule")}</p>
            <p className={css.help}>{t("reminder.limitRule")}</p>
            {isAdmin ? (
                <ScheduleReminderMeta />
            ) : (
                <p className={css.help}>{t("reminder.nonAdminHint")}</p>
            )}
            <ConfirmDialog
                open={confirming}
                title={t(`reminder.dialog.${dialogKey}.title`)}
                description={t(`reminder.dialog.${dialogKey}.description`, { hours })}
                confirmLabel={t(`reminder.dialog.${dialogKey}.confirm`)}
                tone={enabled ? "warning" : "primary"}
                submitOnEnter
                onConfirm={() => {
                    setConfirming(false)
                    onToggle()
                }}
                onCancel={() => setConfirming(false)}
            />
        </section>
    )
}

export default ScheduleReminderFields
