import type AppointmentChip from "@/types/appointments/AppointmentChip.types"
import type AppointmentStatusFilter from "@/types/appointments/AppointmentStatusFilter.types"
import css from "@/styles/components/appointmentStatusChips.module.css"

type AppointmentStatusChipsProps = {
    label: string
    chips: AppointmentChip[]
    active: AppointmentStatusFilter
    onSelect: (value: AppointmentStatusFilter) => void
}

function chipClass(chip: AppointmentChip, active: boolean): string {
    const classes = [css.chip]

    if (chip.value === "waiting_record") {
        classes.push(css.waiting)
    }

    if (active) {
        classes.push(css.active)
    }

    return classes.join(" ")
}

function AppointmentStatusChips({ label, chips, active, onSelect }: AppointmentStatusChipsProps) {
    return (
        <fieldset aria-label={label} className={css.chips}>
            {chips.map((chip) => (
                <button
                    key={chip.value}
                    type="button"
                    aria-pressed={chip.value === active}
                    className={chipClass(chip, chip.value === active)}
                    onClick={() => onSelect(chip.value)}
                >
                    {chip.label} <span className={css.count}>{chip.count}</span>
                </button>
            ))}
        </fieldset>
    )
}

export default AppointmentStatusChips
