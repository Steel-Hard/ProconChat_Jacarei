import type AppointmentPeriod from "@/types/appointments/AppointmentPeriod.types"
import type AppointmentResponsibleFilter from "@/types/appointments/AppointmentResponsibleFilter.types"
import type SelectOption from "@/types/form/SelectOption.types"
import css from "@/styles/components/appointmentListFilters.module.css"

type AppointmentListFiltersProps = {
    periodLabel: string
    responsibleLabel: string
    period: AppointmentPeriod
    responsible: AppointmentResponsibleFilter
    periodOptions: SelectOption<AppointmentPeriod>[]
    responsibleOptions: SelectOption<AppointmentResponsibleFilter>[]
    onPeriodChange: (value: AppointmentPeriod) => void
    onResponsibleChange: (value: AppointmentResponsibleFilter) => void
}

function AppointmentListFilters({
    periodLabel,
    responsibleLabel,
    period,
    responsible,
    periodOptions,
    responsibleOptions,
    onPeriodChange,
    onResponsibleChange
}: AppointmentListFiltersProps) {
    return (
        <div className={css.filters}>
            <label className={css.field}>
                {periodLabel}
                <select
                    className={css.select}
                    value={period}
                    onChange={(event) => onPeriodChange(event.target.value as AppointmentPeriod)}
                >
                    {periodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className={css.field}>
                {responsibleLabel}
                <select
                    className={css.select}
                    value={responsible}
                    onChange={(event) =>
                        onResponsibleChange(event.target.value as AppointmentResponsibleFilter)
                    }
                >
                    {responsibleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    )
}

export default AppointmentListFilters
