import { useTranslation } from "react-i18next"
import AppointmentActions from "@/components/AppointmentActions"
import AppointmentDetailHeader from "@/components/AppointmentDetailHeader"
import AppointmentDocuments from "@/components/AppointmentDocuments"
import AppointmentFacts from "@/components/AppointmentFacts"
import AppointmentHistory from "@/components/AppointmentHistory"
import AppointmentTimeline from "@/components/AppointmentTimeline"
import ConfirmDialog from "@/components/ConfirmDialog"
import useAppointmentDetail from "@/pages/hooks/useAppointmentDetail"
import css from "@/styles/pages/appointmentDetail.module.css"

function AppointmentDetailPage() {
    const { t } = useTranslation(["appointmentDetail", "common"])
    const page = useAppointmentDetail()
    const { view, actions } = page

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
                                    onAction={actions.open}
                                />
                                <AppointmentHistory
                                    title={t("history.title")}
                                    entries={view.history}
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
        </>
    )
}

export default AppointmentDetailPage
