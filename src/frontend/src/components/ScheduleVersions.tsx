import { useId } from "react"
import { useTranslation } from "react-i18next"
import ConfirmDialog from "@/components/ConfirmDialog"
import ScheduleConflictList from "@/components/ScheduleConflictList"
import ScheduleVersionItem from "@/components/ScheduleVersionItem"
import type ScheduleVersionsActions from "@/types/schedule/ScheduleVersionsActions.types"
import type ScheduleVersionsView from "@/types/schedule/ScheduleVersionsView.types"
import css from "@/styles/components/scheduleVersions.module.css"
import formatDate from "@/utils/formatDate"

type ScheduleVersionsProps = {
    view: ScheduleVersionsView
    actions: ScheduleVersionsActions
}

function dateText(value: string): string {
    return formatDate(value) ?? value
}

function ScheduleVersions({ view, actions }: ScheduleVersionsProps) {
    const { t } = useTranslation(["schedule", "common"])
    const errorId = useId()

    return (
        <section className={css.versions} aria-label={t("versions.title")}>
            <div className={css.controls}>
                <div className={css.info}>
                    <strong>
                        {view.effectiveFrom
                            ? t("versions.editing", { date: dateText(view.effectiveFrom) })
                            : t("versions.current")}
                    </strong>
                    {view.currentSince ? (
                        <span>
                            {t("versions.currentSince", { date: dateText(view.currentSince) })}
                        </span>
                    ) : null}
                    {view.effectiveFrom ? (
                        <button
                            type="button"
                            className={css.button}
                            onClick={actions.returnCurrent}
                        >
                            {t("versions.returnCurrent")}
                        </button>
                    ) : null}
                </div>
                <div className={css.dateField}>
                    <label className={css.effectiveDate}>
                        <span>{t("versions.effectiveFrom")}</span>
                        <input
                            type="date"
                            value={view.date}
                            min={view.dateMin}
                            aria-invalid={view.dateError ? true : undefined}
                            aria-describedby={view.dateError ? errorId : undefined}
                            onChange={(event) => actions.changeDate(event.currentTarget.value)}
                        />
                    </label>
                    {view.dateError ? (
                        <p id={errorId} className={css.error}>
                            {view.dateError}
                        </p>
                    ) : null}
                </div>
            </div>
            {view.versionsFailed ? (
                <p role="alert" className={css.alert}>
                    {t("versions.loadFailed")}
                </p>
            ) : view.versions.length > 0 ? (
                <div className={css.list}>
                    <h2 className={css.title}>{t("versions.title")}</h2>
                    <p className={css.notice}>{t("versions.ownCopy")}</p>
                    <ul className={css.items}>
                        {view.versions.map((version) => (
                            <ScheduleVersionItem
                                key={version.effectiveFrom}
                                effectiveFrom={version.effectiveFrom}
                                onEdit={actions.edit}
                                onCancel={actions.askCancel}
                            />
                        ))}
                    </ul>
                </div>
            ) : null}
            {view.cancelConflicts ? (
                <ScheduleConflictList conflicts={view.cancelConflicts} />
            ) : null}
            <ConfirmDialog
                open={view.cancelTarget !== null}
                title={t("versions.cancelConfirm", { date: dateText(view.cancelTarget ?? "") })}
                confirmLabel={t("versions.cancel")}
                tone="danger"
                busy={view.cancelling}
                onConfirm={actions.confirmCancel}
                onCancel={actions.dismissCancel}
            />
            <ConfirmDialog
                open={view.switchPending}
                title={t("versions.discardConfirm")}
                confirmLabel={t("common:unsavedChangesBar.discard")}
                tone="danger"
                onConfirm={actions.confirmSwitch}
                onCancel={actions.dismissSwitch}
            />
        </section>
    )
}

export default ScheduleVersions
