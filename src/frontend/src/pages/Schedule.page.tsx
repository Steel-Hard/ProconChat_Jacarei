import { useTranslation } from "react-i18next"
import LastChangeNote from "@/components/LastChangeNote"
import ScheduleBlockedDates from "@/components/ScheduleBlockedDates"
import ScheduleConflictList from "@/components/ScheduleConflictList"
import ScheduleDurationSeats from "@/components/ScheduleDurationSeats"
import SchedulePreview from "@/components/SchedulePreview"
import ScheduleUnitFields from "@/components/ScheduleUnitFields"
import ScheduleWeekGrid from "@/components/ScheduleWeekGrid"
import ScheduleWindowFields from "@/components/ScheduleWindowFields"
import UnsavedChangesBar from "@/components/UnsavedChangesBar"
import useSchedule from "@/pages/hooks/useSchedule"
import css from "@/styles/pages/schedule.module.css"
import formatDate from "@/utils/formatDate"

function dayAfter(date: string): string {
    const next = new Date(`${date}T12:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    return next.toISOString().slice(0, 10)
}

function SchedulePage() {
    const { t } = useTranslation(["schedule", "common"])
    const page = useSchedule()
    const { draft, actions, preview } = page

    return (
        <>
            <title>{t("meta.title")}</title>
            <section className={css.page}>
                <div className={css.header}>
                    <div className={css.headerText}>
                        <h1 className={css.title}>{t("heading")}</h1>
                        <p className={css.subtitle}>{t("subtitle")}</p>
                        <LastChangeNote change={page.lastChange} />
                    </div>
                    {draft ? (
                        <UnsavedChangesBar
                            changes={page.changes}
                            saving={page.saving}
                            saveDisabled={page.saveDisabled}
                            saveHint={page.saveHint}
                            onDiscard={page.discard}
                            onSave={page.save}
                        />
                    ) : null}
                </div>
                {page.status === "loading" ? (
                    <p className={css.loading}>{t("common:loading")}</p>
                ) : null}
                {page.status === "error" ? (
                    <p role="alert" className={css.alert}>
                        {t("loadFailed")}
                    </p>
                ) : null}
                {page.actionError ? (
                    <p role="alert" className={css.alert}>
                        {page.actionError}
                    </p>
                ) : null}
                <section className={css.versions} aria-label={t("versions.title")}>
                    <div className={css.versionControls}>
                        <div className={css.versionInfo}>
                            <strong>
                                {page.effectiveFrom
                                    ? t("versions.editing", {
                                          date: formatDate(page.effectiveFrom) ?? page.effectiveFrom
                                      })
                                    : t("versions.current")}
                            </strong>
                            {page.effectiveFrom ? (
                                <button type="button" onClick={() => page.selectEffectiveFrom("")}>
                                    {t("versions.returnCurrent")}
                                </button>
                            ) : null}
                        </div>
                        <label className={css.effectiveDate}>
                            <span>{t("versions.effectiveFrom")}</span>
                            <input
                                type="date"
                                value={page.effectiveFrom}
                                min={
                                    page.preview.preview
                                        ? dayAfter(page.preview.preview.today)
                                        : undefined
                                }
                                onChange={(event) =>
                                    page.selectEffectiveFrom(event.currentTarget.value)
                                }
                            />
                        </label>
                    </div>
                    {page.versionsFailed ? (
                        <p role="alert" className={css.alert}>
                            {t("versions.loadFailed")}
                        </p>
                    ) : page.versions.length > 0 ? (
                        <div className={css.versionList}>
                            <h2>{t("versions.title")}</h2>
                            <ul>
                                {page.versions.map((version) => (
                                    <li key={version.effectiveFrom}>
                                        <span>
                                            {formatDate(version.effectiveFrom) ??
                                                version.effectiveFrom}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                page.selectEffectiveFrom(version.effectiveFrom)
                                            }
                                        >
                                            {t("versions.edit")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void page.cancelScheduledVersion(
                                                    version.effectiveFrom
                                                )
                                            }
                                        >
                                            {t("versions.cancel")}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </section>
                {draft && page.bookedDaysFailed ? (
                    <p className={css.warning}>{t("bookedDaysFailed")}</p>
                ) : null}
                {draft && page.conflictRows ? (
                    <ScheduleConflictList conflicts={page.conflictRows} />
                ) : null}
                {draft ? (
                    <div className={css.columns}>
                        <div className={css.form}>
                            <ScheduleWeekGrid
                                days={page.days}
                                showContentLink={page.showContentLink}
                                onToggleDay={actions.toggleDay}
                                onChangeRange={actions.changeRange}
                                onRemoveRange={actions.removeRange}
                                onAddRange={actions.addRange}
                            />
                            <ScheduleDurationSeats
                                slotMinutes={draft.slotMinutes}
                                seatsPerSlot={draft.seatsPerSlot}
                                durationMessages={page.durationMessages}
                                seatsMessages={page.seatsMessages}
                                onChangeSlotMinutes={actions.setSlotMinutes}
                                onChangeSeats={(value) => actions.setText("seatsPerSlot", value)}
                            />
                            <ScheduleWindowFields
                                windowDays={draft.windowDays}
                                minNoticeDays={draft.minNoticeDays}
                                waitAlertDays={draft.waitAlertDays}
                                windowMessages={page.windowMessages}
                                waitAlertMessages={page.waitAlertMessages}
                                onChangeWindowDays={(value) => actions.setText("windowDays", value)}
                                onChangeMinNoticeDays={actions.setMinNoticeDays}
                                onChangeWaitAlertDays={(value) =>
                                    actions.setText("waitAlertDays", value)
                                }
                            />
                            <ScheduleUnitFields
                                address={draft.unitAddress}
                                complement={draft.unitAddressComplement}
                                addressMessages={page.addressMessages}
                                complementMessages={page.complementMessages}
                                showContentLink={page.showContentLink}
                                onChangeAddress={(value) => actions.setText("unitAddress", value)}
                                onChangeComplement={(value) =>
                                    actions.setText("unitAddressComplement", value)
                                }
                            />
                            <ScheduleBlockedDates
                                blocks={page.blocks}
                                newDate={page.newBlock.date}
                                newDescription={page.newBlock.description}
                                newError={page.newBlockError}
                                onChangeNewDate={actions.setNewBlockDate}
                                onChangeNewDescription={actions.setNewBlockDescription}
                                onAdd={actions.addBlock}
                                onRemove={actions.removeBlock}
                            />
                        </div>
                        <SchedulePreview
                            preview={preview.preview}
                            month={preview.month}
                            updating={preview.updating}
                            bookedDays={page.bookedDays}
                            selectedDate={preview.selectedDate}
                            loading={preview.loading}
                            failed={preview.failed}
                            stale={preview.stale}
                            onShiftMonth={preview.shiftMonth}
                            onSelectDay={preview.selectDay}
                        />
                    </div>
                ) : null}
            </section>
        </>
    )
}

export default SchedulePage
