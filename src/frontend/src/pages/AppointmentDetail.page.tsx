import { useTranslation } from "react-i18next"
import AppointmentActions from "@/components/AppointmentActions"
import AppointmentDetailHeader from "@/components/AppointmentDetailHeader"
import AppointmentDocuments from "@/components/AppointmentDocuments"
import AppointmentFacts from "@/components/AppointmentFacts"
import AppointmentHistory from "@/components/AppointmentHistory"
import AppointmentManagement from "@/components/AppointmentManagement"
import AppointmentTimeline from "@/components/AppointmentTimeline"
import ConfirmDialog from "@/components/ConfirmDialog"
import useAppointmentDetail from "@/pages/hooks/useAppointmentDetail"
import css from "@/styles/pages/appointmentDetail.module.css"
import type AppointmentAction from "@/types/appointments/AppointmentAction.types"

function AppointmentDetailPage() {
    const { t } = useTranslation(["appointmentDetail", "common"])
    const page = useAppointmentDetail()
    const { view, actions } = page
    const onAction = (action: AppointmentAction) => {
        if (action === "cancel") {
            page.cancellation.openDialog()
        } else {
            actions.open(action)
        }
    }

    return (
        <>
            <title>{page.title}</title>
            <section className={css.page}>
                <button type="button" className={css.back} onClick={page.back}>
                    <span aria-hidden="true">{t("backIcon")}</span> {t("back")}
                </button>
                {page.loading ? <p className={css.status}>{t("common:loading")}</p> : null}
                {page.notFound ? <p className={css.status}>{t("notFound")}</p> : null}
                {page.failed ? (
                    <div className={css.status}>
                        <p role="alert" className={css.alert}>
                            {t("loadFailed")}
                        </p>
                        <button type="button" className={css.retry} onClick={page.retry}>
                            {t("retry")}
                        </button>
                    </div>
                ) : null}
                {view && actions.view ? (
                    <>
                        <AppointmentDetailHeader {...view.header} />
                        <div className={css.columns}>
                            <div className={css.main}>
                                <AppointmentFacts
                                    title={t("facts.title")}
                                    facts={view.facts}
                                    notice={view.factsNotice}
                                />
                                <AppointmentDocuments
                                    title={t("documents.title")}
                                    note={view.documents.note}
                                    configNotice={view.documents.configNotice}
                                    groups={view.documents.groups}
                                />
                                <AppointmentTimeline
                                    title={t("timeline.title")}
                                    note={t("timeline.note")}
                                    emptyText={t("timeline.empty")}
                                    aiLabel={t("timeline.ai")}
                                    steps={view.steps}
                                />
                            </div>
                            <div className={css.side}>
                                <AppointmentActions
                                    title={t("actions.title")}
                                    view={actions.view}
                                    dateNote={t("actions.dateNote")}
                                    onAction={onAction}
                                />
                                <AppointmentManagement
                                    assignment={actions.assignment}
                                    labels={{
                                        assignmentTitle: t("assignment.title"),
                                        chooseStaff: t("assignment.chooseStaff"),
                                        assign: t("assignment.assign"),
                                        staffError: t("assignment.staffError"),
                                        retry: t("retry"),
                                        notesTitle: t("notes.title"),
                                        notesVisibility: t("notes.visibility"),
                                        notePlaceholder: t("notes.placeholder"),
                                        addNote: t("notes.add"),
                                        noNotes: t("notes.empty"),
                                        author: t("notes.author"),
                                        date: t("notes.date")
                                    }}
                                />
                                <AppointmentHistory
                                    title={t("history.title")}
                                    entries={view.history}
                                    retry={{
                                        allowed: page.cancellation.canRetryNotice,
                                        busy: page.cancellation.retryBusy,
                                        label: t("history.retryNotice"),
                                        error: page.cancellation.canRetryNotice
                                            ? page.cancellation.retryError
                                            : null,
                                        onRetry: page.cancellation.retryNotice
                                    }}
                                />
                            </div>
                        </div>
                    </>
                ) : null}
            </section>
            <ConfirmDialog
                open={actions.dialog !== null}
                title={actions.dialog?.title ?? ""}
                description={actions.dialog?.description}
                confirmLabel={actions.dialog?.confirmLabel ?? ""}
                busy={actions.busy}
                onConfirm={actions.confirm}
                onCancel={actions.cancel}
            />
            <ConfirmDialog
                open={page.cancellation.open}
                title={t("actions.cancel.title")}
                description={t("actions.cancel.description")}
                confirmLabel={t("actions.cancel.confirm")}
                cancelLabel={t("actions.cancel.dismiss")}
                tone="danger"
                busy={page.cancellation.busy}
                confirmDisabled={
                    page.cancellation.reason === "" || page.cancellation.preview === undefined
                }
                onConfirm={page.cancellation.cancelAppointment}
                onCancel={page.cancellation.closeDialog}
                submitOnEnter
            >
                <div className={css.cancelFields}>
                    <label className={css.cancelField}>
                        {t("actions.cancel.reasonLabel")}
                        <select
                            required
                            value={page.cancellation.reason}
                            disabled={page.cancellation.busy}
                            onChange={(event) =>
                                page.cancellation.setReason(
                                    event.target.value as
                                        | "UNIT_CLOSED"
                                        | "CITIZEN_REQUEST"
                                        | "DUPLICATE"
                                        | "OTHER"
                                        | ""
                                )
                            }
                        >
                            <option value="">{t("actions.cancel.selectReason")}</option>
                            <option value="UNIT_CLOSED">
                                {t("actions.cancel.reasons.UNIT_CLOSED")}
                            </option>
                            <option value="CITIZEN_REQUEST">
                                {t("actions.cancel.reasons.CITIZEN_REQUEST")}
                            </option>
                            <option value="DUPLICATE">
                                {t("actions.cancel.reasons.DUPLICATE")}
                            </option>
                            <option value="OTHER">{t("actions.cancel.reasons.OTHER")}</option>
                        </select>
                    </label>
                    <div className={css.cancelPreview}>
                        <span className={css.cancelLabel}>{t("actions.cancel.previewLabel")}</span>
                        {page.cancellation.previewLoading ? (
                            <p>{t("common:loading")}</p>
                        ) : page.cancellation.previewFailed ? (
                            <div>
                                <p role="alert">{t("actions.cancel.previewFailed")}</p>
                                <button
                                    type="button"
                                    className={css.retry}
                                    onClick={page.cancellation.retryPreview}
                                >
                                    {t("actions.cancel.retryPreview")}
                                </button>
                            </div>
                        ) : (
                            <p>{page.cancellation.preview ?? t("actions.cancel.chooseReason")}</p>
                        )}
                    </div>
                    <p className={css.cancelHint}>{t("actions.cancel.fixedMessageHint")}</p>
                    <label className={css.cancelField}>
                        {t("actions.cancel.noteLabel")}
                        <textarea
                            value={page.cancellation.note}
                            maxLength={2000}
                            disabled={page.cancellation.busy}
                            onChange={(event) => page.cancellation.setNote(event.target.value)}
                        />
                    </label>
                    {page.cancellation.error ? (
                        <p role="alert" className={css.alert}>
                            {page.cancellation.error}
                        </p>
                    ) : null}
                </div>
            </ConfirmDialog>
        </>
    )
}

export default AppointmentDetailPage
