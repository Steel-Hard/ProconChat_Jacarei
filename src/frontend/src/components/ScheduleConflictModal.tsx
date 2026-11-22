import { useEffect, useId, useRef } from "react"
import { useTranslation } from "react-i18next"
import AppointmentNotice from "@/components/AppointmentNotice"
import ScheduleConflictModalRow from "@/components/ScheduleConflictModalRow"
import type ScheduleConflict from "@/types/schedule/ScheduleConflict.types"
import type ScheduleConflictModalOrigin from "@/types/schedule/ScheduleConflictModalOrigin.types"
import type WhatsAppCancellationNoticeProblemCode from "@/types/whatsapp/WhatsAppCancellationNoticeProblemCode.types"
import css from "@/styles/components/scheduleConflictModal.module.css"

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const ORIGIN_TEXT_KEYS = {
    save: {
        title: "conflicts.title",
        descriptionWithCancel: "conflictModal.save.descriptionWithCancel",
        descriptionKeepOnly: "conflictModal.save.descriptionKeepOnly",
        keepDescription: "conflictModal.save.keepDescription",
        keepAction: "conflictModal.save.keepAction",
        cancelActionOn: "conflictModal.save.cancelActionOn",
        cancelActionOff: "conflictModal.save.cancelActionOff",
        back: "conflictModal.save.back"
    },
    cancelScheduledChange: {
        title: "conflictModal.cancelScheduledChange.title",
        descriptionWithCancel: "conflictModal.cancelScheduledChange.descriptionWithCancel",
        descriptionKeepOnly: "conflictModal.cancelScheduledChange.descriptionKeepOnly",
        keepDescription: "conflictModal.cancelScheduledChange.keepDescription",
        keepAction: "conflictModal.cancelScheduledChange.keepAction",
        cancelActionOn: "conflictModal.cancelScheduledChange.cancelActionOn",
        cancelActionOff: "conflictModal.cancelScheduledChange.cancelActionOff",
        back: "conflictModal.cancelScheduledChange.back"
    }
} as const

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
    const focusable = Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])

    if (focusable.length === 0) {
        event.preventDefault()
        return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    const inside = active instanceof Node && container?.contains(active)

    if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault()
        last.focus()
    } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault()
        first.focus()
    }
}

type ScheduleConflictModalProps = {
    conflicts: ScheduleConflict[] | null
    origin?: ScheduleConflictModalOrigin
    changeDate?: string | null
    changedNotice?: boolean
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
    origin = "save",
    changeDate = null,
    changedNotice = false,
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
    const keepRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDialogElement>(null)
    const open = conflicts !== null && conflicts.length > 0

    useEffect(() => {
        if (!open) {
            return
        }

        const previous =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        keepRef.current?.focus()

        return () => {
            previous?.focus()
        }
    }, [open])

    useEffect(() => {
        if (!open) {
            return
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !busy) {
                onClose()
            } else if (event.key === "Tab") {
                trapFocus(event, dialogRef.current)
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [open, busy, onClose])

    if (!open) {
        return null
    }

    const count = conflicts.length
    const noticeReady = !noticeLoading && !noticeFailed && noticeEnabled !== null
    const textKeys = ORIGIN_TEXT_KEYS[origin]
    const descriptionKey = canManageAppointments
        ? textKeys.descriptionWithCancel
        : textKeys.descriptionKeepOnly

    return (
        <div className={css.overlay} role="presentation">
            <dialog
                ref={dialogRef}
                open
                className={css.dialog}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
            >
                <div className={css.header}>
                    <h2 id={titleId} className={css.title}>
                        {t(textKeys.title, { count, date: changeDate })}
                    </h2>
                    <p id={descriptionId} className={css.description}>
                        {t(descriptionKey)}
                    </p>
                    {changedNotice ? (
                        <output className={css.changedNotice}>
                            {t("conflictModal.changedNotice")}
                        </output>
                    ) : null}
                </div>
                <ul className={css.list}>
                    {conflicts.map((conflict) => (
                        <ScheduleConflictModalRow key={conflict.id} conflict={conflict} />
                    ))}
                </ul>
                <div className={css.footer}>
                    <div className={css.options}>
                        <div className={css.option}>
                            <p className={css.optionText}>{t(textKeys.keepDescription)}</p>
                            <button
                                ref={keepRef}
                                type="button"
                                className={css.keepButton}
                                disabled={busy}
                                onClick={onKeep}
                            >
                                {t(textKeys.keepAction)}
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
                                {noticeReady ? (
                                    <button
                                        type="button"
                                        className={css.cancelButton}
                                        disabled={busy}
                                        onClick={onCancelAppointments}
                                    >
                                        {t(
                                            noticeEnabled
                                                ? textKeys.cancelActionOn
                                                : textKeys.cancelActionOff
                                        )}
                                    </button>
                                ) : null}
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
                        {t(textKeys.back)}
                    </button>
                </div>
            </dialog>
        </div>
    )
}

export default ScheduleConflictModal
