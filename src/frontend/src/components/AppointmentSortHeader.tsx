import type AppointmentSortBy from "@/types/appointments/AppointmentSortBy.types"
import type AppointmentSortOrder from "@/types/appointments/AppointmentSortOrder.types"
import css from "@/styles/components/appointmentTable.module.css"

type AppointmentSortHeaderProps = {
    label: string
    column: AppointmentSortBy
    sortBy?: AppointmentSortBy
    sortOrder?: AppointmentSortOrder
    arrows: { asc: string; desc: string }
    onSort: (column: AppointmentSortBy) => void
}

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const

function AppointmentSortHeader({
    label,
    column,
    sortBy,
    sortOrder,
    arrows,
    onSort
}: AppointmentSortHeaderProps) {
    const order = sortBy === column ? sortOrder : undefined

    return (
        <th scope="col" aria-sort={order ? ARIA_SORT[order] : "none"}>
            <button
                type="button"
                className={order ? `${css.sort} ${css.sorted}` : css.sort}
                onClick={() => onSort(column)}
            >
                {label}
                {order ? (
                    <span aria-hidden="true" className={css.arrow}>
                        {arrows[order]}
                    </span>
                ) : null}
            </button>
        </th>
    )
}

export default AppointmentSortHeader
