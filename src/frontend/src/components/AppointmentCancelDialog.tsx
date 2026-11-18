import { useState } from "react"
import { useTranslation } from "react-i18next"
import APPOINTMENT_NOTE_MAX_LENGTH from "@/utils/appointmentNoteMaxLength"
import AppointmentNotice from "@/components/AppointmentNotice"
import ConfirmDialog from "@/components/ConfirmDialog"
import css from "@/styles/components/appointmentCancelDialog.module.css"
import type AppointmentCancelView from "@/types/appointments/AppointmentCancelView.types"

const REASONS = ["UNIT_CLOSED", "CITIZEN_REQUEST", "DUPLICATE", "OTHER"] as const

type Props = {
    view: AppointmentCancelView
}

function AppointmentCancelDialog({ view }: Props) {
    const { t } = useTranslation(["appointmentDetail", "common"])
    const [attempted, setAttempted] = useState(false)

    function confirm() {
        if (view.reason === "") {
            setAttempted(true)
            return
        }

        view.confirm()
    }

    function close() {
        setAttempted(false)
        view.close()
    }

    return (
        <ConfirmDialog
            open={view.open}
            title={t("actions.cancel.title", { protocol: view.protocol })}
            description={view.subtitle}
            confirmLabel={t(
                view.noticeDisabled ? "actions.cancel.confirmNoNotice" : "actions.cancel.confirm"
            )}
            cancelLabel={t("actions.cancel.dismiss")}
            tone="danger"
            busy={view.busy}
            confirmDisabled={
                view.previewLoading ||
                view.previewFailed ||
                (!view.noticeDisabled && view.reason !== "" && view.preview === undefined)
            }
            onConfirm={confirm}
            onCancel={close}
            submitOnEnter
        >
            <div className={css.fields}>
                <fieldset className={css.reasons}>
                    <legend className={css.label}>
                        {t("actions.cancel.reasonLabel")}
                        <span className={css.required} aria-hidden="true">
                            {t("actions.cancel.required")}
                        </span>
                    </legend>
                    {REASONS.map((reason) => (
                        <label
                            key={reason}
                            className={
                                view.reason === reason
                                    ? `${css.reason} ${css.selected}`
                                    : css.reason
                            }
                        >
                            <input
                                type="radio"
                                name="cancel-reason"
                                value={reason}
                                checked={view.reason === reason}
                                disabled={view.busy}
                                onChange={() => {
                                    setAttempted(false)
                                    view.setReason(reason)
                                }}
                            />
                            {t(`actions.cancel.reasons.${reason}`)}
                        </label>
                    ))}
                    {attempted && view.reason === "" ? (
                        <p role="alert" className={css.error}>
                            {t("actions.cancel.reasonRequired")}
                        </p>
                    ) : null}
                </fieldset>
                {view.noticeDisabled ? (
                    <p className={css.noNotice}>
                        <strong>{t("actions.cancel.noticeOff")}</strong>
                    </p>
                ) : (
                    <>
                        {view.problem ? (
                            <AppointmentNotice>
                                {t("common:cancellationNoticeProblem.prefix", {
                                    reason: view.problem
                                })}
                            </AppointmentNotice>
                        ) : null}
                        {view.previewLoading ? (
                            <p className={css.preview}>{t("actions.cancel.verifying")}</p>
                        ) : view.previewFailed ? (
                            <div className={css.preview}>
                                <p role="alert">{t("actions.cancel.previewFailed")}</p>
                                <button
                                    type="button"
                                    className={css.retry}
                                    onClick={view.retryPreview}
                                >
                                    {t("actions.cancel.retryPreview")}
                                </button>
                            </div>
                        ) : (
                            <div className={css.previewBlock}>
                                <div className={css.previewHeader}>
                                    <span className={css.label}>
                                        {t("actions.cancel.previewLabel")}
                                    </span>
                                    <span className={css.tag}>{t("actions.cancel.fixedTag")}</span>
                                </div>
                                <p
                                    className={
                                        view.preview
                                            ? css.preview
                                            : `${css.preview} ${css.placeholder}`
                                    }
                                >
                                    {view.preview ?? t("actions.cancel.chooseReason")}
                                </p>
                                <p className={css.hint}>{t("actions.cancel.fixedMessageHint")}</p>
                            </div>
                        )}
                    </>
                )}
                <label className={css.note}>
                    <span>
                        {t("actions.cancel.noteLabel")}
                        <span className={css.optional} data-optional="true">
                            {t("actions.cancel.noteOptional")}
                        </span>
                    </span>
                    <textarea
                        rows={2}
                        value={view.note}
                        maxLength={APPOINTMENT_NOTE_MAX_LENGTH}
                        disabled={view.busy}
                        onChange={(event) => view.setNote(event.target.value)}
                    />
                </label>
                {view.error ? (
                    <p role="alert" className={css.error}>
                        {view.error}
                    </p>
                ) : null}
            </div>
        </ConfirmDialog>
    )
}

export default AppointmentCancelDialog
