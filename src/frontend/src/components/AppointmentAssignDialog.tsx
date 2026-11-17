import { useTranslation } from "react-i18next"
import ConfirmDialog from "@/components/ConfirmDialog"
import css from "@/styles/components/appointmentAssignDialog.module.css"
import type AppointmentAssignView from "@/types/appointments/AppointmentAssignView.types"

type Props = {
    view: AppointmentAssignView
}

function AppointmentAssignDialog({ view }: Props) {
    const { t } = useTranslation("appointmentDetail")

    return (
        <ConfirmDialog
            open={view.open}
            title={view.title}
            description={t("assignment.description")}
            confirmLabel={t("assignment.assign")}
            cancelLabel={t("assignment.back")}
            confirmDisabled={view.selectedId === "" || view.loading || view.failed}
            busy={view.busy}
            onConfirm={view.onConfirm}
            onCancel={view.onClose}
        >
            {view.failed ? (
                <div className={css.error}>
                    <p role="alert">{t("assignment.staffError")}</p>
                    <button type="button" className={css.retry} onClick={view.onRetry}>
                        {t("retry")}
                    </button>
                </div>
            ) : (
                <ul className={css.list}>
                    {view.staff.map((person) => (
                        <li key={person.id}>
                            <button
                                type="button"
                                className={
                                    person.id === view.selectedId
                                        ? `${css.option} ${css.selected}`
                                        : css.option
                                }
                                aria-pressed={person.id === view.selectedId}
                                onClick={() => view.onSelect(person.id)}
                            >
                                <strong>{person.name}</strong>
                                {person.email ? (
                                    <span className={css.email}>{person.email}</span>
                                ) : null}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </ConfirmDialog>
    )
}

export default AppointmentAssignDialog
