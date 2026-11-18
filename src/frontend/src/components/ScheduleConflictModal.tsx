import { useEffect, useId, type MouseEvent } from "react"
import { useTranslation } from "react-i18next"
import AppointmentNotice from "@/components/AppointmentNotice"
import ScheduleConflictRow from "@/components/ScheduleConflictRow"
import type ScheduleConflict from "@/types/schedule/ScheduleConflict.types"
import type WhatsAppCancellationNoticeProblemCode from "@/types/whatsapp/WhatsAppCancellationNoticeProblemCode.types"
import css from "@/styles/components/scheduleConflictModal.module.css"

type ScheduleConflictModalProps = {
    conflicts: ScheduleConflict[] | null
    canManageAppointments: boolean
    noticeEnabled: boolean | null
    noticeProblemCode: WhatsAppCancellationNoticeProblemCode | null
    noticeLoading: boolean
    noticeFailed: boolean
    busy: boolean
    error: string | null
    onRetryNotice: () => void
    onKeep: () => void
    onCancelAppointments: () => void
    onClose: () => void
}

function ScheduleConflictModal({
    conflicts,
    canManageAppointments,
    noticeEnabled,
    noticeProblemCode,
    noticeLoading,
    noticeFailed,
    busy,
    error,
    onRetryNotice,
    onKeep,
    onCancelAppointments,
    onClose
}: ScheduleConflictModalProps) {
    const { t } = useTranslation(["schedule", "common"])
    const titleId = useId()
    const descriptionId = useId()
    const open = conflicts !== null && conflicts.length > 0

    useEffect(() => {
        if (!open) {
            return
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !busy) {
                onClose()
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [open, busy, onClose])

    if (!open) {
        return null
    }

    function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
        if (event.target === event.currentTarget && !busy) {
            onClose()
        }
    }

    const count = conflicts.length
    const noticeReady = !noticeLoading && !noticeFailed && noticeEnabled !== null
    const cancelDisabled = busy || !noticeReady

    return (
        <div className={css.overlay} role="presentation" onClick={handleOverlayClick}>
            <dialog
                open
                className={css.dialog}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
            >
                <div className={css.header}>
                    <h2 id={titleId} className={css.title}>
                        {t("conflicts.title", { count })}
                    </h2>
                    <p id={descriptionId} className={css.description}>
                        {t("conflictModal.description")}
                    </p>
                </div>
                <ul className={css.list}>
                    {conflicts.map((conflict) => (
                        <ScheduleConflictRow
                            key={`${conflict.protocol}-${conflict.code}`}
                            conflict={conflict}
                        />
                    ))}
                </ul>
                <div className={css.footer}>
                    <div className={css.options}>
                        <div className={css.option}>
                            <p className={css.optionText}>{t("conflictModal.keepDescription")}</p>
                            <button
                                type="button"
                                className={css.keepButton}
                                disabled={busy}
                                onClick={onKeep}
                            >
                                {t("conflictModal.keepAction")}
                            </button>
                        </div>
                        {canManageAppointments ? (
                            <div className={`${css.option} ${css.optionDanger}`}>
                                {noticeLoading ? (
                                    <p className={css.optionText}>
                                        {t("conflictModal.noticeLoading")}
                                    </p>
                                ) : noticeFailed ? (
                                    <>
                                        <p role="alert" className={css.error}>
                                            {t("conflictModal.noticeFailed")}
                                        </p>
                                        <button
                                            type="button"
                                            className={css.retryButton}
                                            disabled={busy}
                                            onClick={onRetryNotice}
                                        >
                                            {t("conflictModal.retryNotice")}
                                        </button>
                                    </>
                                ) : noticeEnabled ? (
                                    <>
                                        {noticeProblemCode ? (
                                            <AppointmentNotice>
                                                {t("common:cancellationNoticeProblem.prefix", {
                                                    reason: t(
                                                        `common:cancellationNoticeProblem.codes.${noticeProblemCode}`
                                                    )
                                                })}
                                            </AppointmentNotice>
                                        ) : null}
                                        <p className={css.optionText}>
                                            {t("conflictModal.cancelSummaryOn", { count })}
                                        </p>
                                    </>
                                ) : (
                                    <p className={css.optionText}>
                                        {t("conflictModal.cancelSummaryOff", { count })}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    className={css.cancelButton}
                                    disabled={cancelDisabled}
                                    onClick={onCancelAppointments}
                                >
                                    {t(
                                        noticeEnabled
                                            ? "conflictModal.cancelActionOn"
                                            : "conflictModal.cancelActionOff"
                                    )}
                                </button>
                            </div>
                        ) : null}
                    </div>
                    {error ? (
                        <p role="alert" className={css.error}>
                            {error}
                        </p>
                    ) : null}
                    <button
                        type="button"
                        className={css.backButton}
                        disabled={busy}
                        onClick={onClose}
                    >
                        {t("conflictModal.back")}
                    </button>
                </div>
            </dialog>
        </div>
    )
}

export default ScheduleConflictModal
