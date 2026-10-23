import { useId, useState } from "react"
import ConfirmDialog from "@/components/ConfirmDialog"
import type Reassignment from "@/types/users/Reassignment.types"
import type ReassignmentAppointmentView from "@/types/users/ReassignmentAppointmentView.types"
import type ReassignmentDialogTexts from "@/types/users/ReassignmentDialogTexts.types"
import type ReassignmentTargetView from "@/types/users/ReassignmentTargetView.types"
import css from "@/styles/components/reassignmentDialog.module.css"

type ReassignmentDialogProps = {
    open: boolean
    texts: ReassignmentDialogTexts
    appointments: ReassignmentAppointmentView[]
    targets: ReassignmentTargetView[]
    onConfirm: (reassignment: Reassignment) => void
    onCancel: () => void
}

function ReassignmentDialog({
    open,
    texts,
    appointments,
    targets,
    onConfirm,
    onCancel
}: ReassignmentDialogProps) {
    const listId = useId()
    const radioName = useId()
    const [mode, setMode] = useState<Reassignment["mode"]>("pending")
    const [toUserId, setToUserId] = useState<number | null>(targets[0]?.id ?? null)
    const hasTargets = targets.length > 0
    const missingTarget = mode === "assign" && toUserId === null

    function confirm() {
        if (mode === "assign" && toUserId !== null) {
            onConfirm({ mode: "assign", toUserId })
            return
        }

        onConfirm({ mode: "pending" })
    }

    function chooseTarget(value: string) {
        setToUserId(Number(value))
        setMode("assign")
    }

    return (
        <ConfirmDialog
            open={open}
            title={texts.title}
            description={texts.description}
            confirmLabel={texts.confirm}
            cancelLabel={texts.back}
            confirmDisabled={missingTarget}
            onConfirm={confirm}
            onCancel={onCancel}
        >
            <span id={listId} className={css.visuallyHidden}>
                {texts.listLabel}
            </span>
            <ul className={css.list} aria-labelledby={listId}>
                {appointments.map((appointment) => (
                    <li key={appointment.id} className={css.item}>
                        <span className={css.protocol}>{appointment.protocol}</span>
                        <span className={css.holder}>{appointment.name}</span>
                        <span className={css.when}>{appointment.when}</span>
                    </li>
                ))}
            </ul>
            <fieldset className={css.options}>
                <legend className={css.visuallyHidden}>{texts.optionsLabel}</legend>
                <label className={mode === "pending" ? `${css.option} ${css.chosen}` : css.option}>
                    <input
                        type="radio"
                        name={radioName}
                        className={css.radio}
                        checked={mode === "pending"}
                        onChange={() => setMode("pending")}
                    />
                    {texts.pending}
                </label>
                <div className={mode === "assign" ? `${css.option} ${css.chosen}` : css.option}>
                    <label className={css.optionLabel}>
                        <input
                            type="radio"
                            name={radioName}
                            className={css.radio}
                            checked={mode === "assign"}
                            disabled={!hasTargets}
                            onChange={() => setMode("assign")}
                        />
                        {texts.assign}
                    </label>
                    {hasTargets ? (
                        <select
                            className={css.select}
                            aria-label={texts.assignTo}
                            value={toUserId ?? ""}
                            onChange={(event) => chooseTarget(event.target.value)}
                        >
                            {targets.map((target) => (
                                <option key={target.id} value={target.id}>
                                    {target.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className={css.noTargets}>{texts.noTargets}</span>
                    )}
                </div>
            </fieldset>
            <p className={css.note}>{texts.historyNote}</p>
        </ConfirmDialog>
    )
}

export default ReassignmentDialog
