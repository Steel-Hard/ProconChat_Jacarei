import type SelectOption from "@/types/form/SelectOption.types"
import css from "@/styles/components/appointmentSortSelect.module.css"

type AppointmentSortSelectProps = {
    label: string
    options: SelectOption[]
    value: string
    onChange: (value: string) => void
}

function AppointmentSortSelect({ label, options, value, onChange }: AppointmentSortSelectProps) {
    return (
        <div className={css.bar}>
            <label className={css.field}>
                {label}
                <select
                    className={css.select}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    )
}

export default AppointmentSortSelect
