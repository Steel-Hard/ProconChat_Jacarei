import { useTranslation } from "react-i18next"
import ConfirmDialog from "@/components/ConfirmDialog"
import EmptyState from "@/components/EmptyState"
import InfoTooltip from "@/components/InfoTooltip"
import LastChangeNote from "@/components/LastChangeNote"
import StatusBadge from "@/components/StatusBadge"
import UnsavedChangesBar from "@/components/UnsavedChangesBar"
import APPOINTMENT_STATUS_ORDER from "@/status/appointmentStatusOrder"
import CONVERSATION_OUTCOME_ORDER from "@/status/conversationOutcomeOrder"
import useLayoutPreview from "@/pages/hooks/useLayoutPreview"
import css from "@/styles/pages/layoutPreview.module.css"

function LayoutPreviewPage() {
    const { t } = useTranslation("layoutPreview")
    const preview = useLayoutPreview()
    const danger = preview.dialogTone === "danger"

    return (
        <>
            <title>{t("meta.title")}</title>
            <div className={css.page}>
                <div className={css.header}>
                    <div>
                        <h1 className={css.title}>{t("heading")}</h1>
                        <p className={css.subtitle}>{t("subtitle")}</p>
                        <LastChangeNote change={preview.lastChange} />
                    </div>
                    <UnsavedChangesBar
                        changes={preview.changes.map((change) => t(`changes.${change}`))}
                        saving={preview.saving}
                        onDiscard={preview.discardChanges}
                        onSave={preview.saveChanges}
                    />
                </div>

                <section className={css.card} aria-labelledby="preview-status">
                    <h2 id="preview-status" className={css.cardTitle}>
                        {t("status.appointment")}
                    </h2>
                    <div className={css.row}>
                        {APPOINTMENT_STATUS_ORDER.map((status) => (
                            <StatusBadge key={status} kind="appointment" status={status} />
                        ))}
                    </div>
                    <h2 className={css.cardTitle}>{t("status.outcome")}</h2>
                    <div className={css.row}>
                        {CONVERSATION_OUTCOME_ORDER.map((status) => (
                            <StatusBadge key={status} kind="outcome" status={status} />
                        ))}
                    </div>
                </section>

                <section className={css.card} aria-labelledby="preview-actions">
                    <h2 id="preview-actions" className={css.cardTitle}>
                        {t("actions.heading")}
                    </h2>
                    <div className={css.row}>
                        <span className={css.inline}>
                            {t("actions.messages")}
                            <InfoTooltip text={t("actions.messagesTooltip")} />
                        </span>
                        <button
                            type="button"
                            className={css.button}
                            onClick={() => preview.openDialog("primary")}
                        >
                            {t("actions.openDialog")}
                        </button>
                        <button
                            type="button"
                            className={css.button}
                            onClick={() => preview.openDialog("danger")}
                        >
                            {t("actions.openDangerDialog")}
                        </button>
                        <button
                            type="button"
                            className={css.button}
                            onClick={() => preview.showToast(t("toasts.assumed"))}
                        >
                            {t("actions.showToast")}
                        </button>
                        <button type="button" className={css.button} onClick={preview.resetChanges}>
                            {t("actions.resetChanges")}
                        </button>
                    </div>
                </section>

                <section className={css.card} aria-label={t("empty.region")}>
                    <EmptyState
                        title={t("empty.title")}
                        description={t("empty.description")}
                        action={{
                            label: t("empty.action"),
                            onClick: () => preview.showToast(t("toasts.listUpdated"))
                        }}
                    />
                </section>
            </div>

            <ConfirmDialog
                open={preview.dialogTone !== null}
                tone={danger ? "danger" : "primary"}
                title={danger ? t("dialog.dangerTitle") : t("dialog.primaryTitle")}
                description={
                    danger ? t("dialog.dangerDescription") : t("dialog.primaryDescription")
                }
                confirmLabel={danger ? t("dialog.dangerConfirm") : t("dialog.primaryConfirm")}
                onConfirm={preview.confirmDialog}
                onCancel={preview.closeDialog}
            />
        </>
    )
}

export default LayoutPreviewPage
