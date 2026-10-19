import AppointmentCompactRow from "@/components/AppointmentCompactRow"
import AppointmentRow from "@/components/AppointmentRow"
import AppointmentSortHeader from "@/components/AppointmentSortHeader"
import type AppointmentListOrigin from "@/types/appointments/AppointmentListOrigin.types"
import type AppointmentRowView from "@/types/appointments/AppointmentRowView.types"
import type AppointmentSortBy from "@/types/appointments/AppointmentSortBy.types"
import type AppointmentSortOrder from "@/types/appointments/AppointmentSortOrder.types"
import type AppointmentTableTexts from "@/types/appointments/AppointmentTableTexts.types"
import css from "@/styles/components/appointmentTable.module.css"

type AppointmentTableProps = {
    rows: AppointmentRowView[]
    compact: boolean
    texts: AppointmentTableTexts
    sortBy?: AppointmentSortBy
    sortOrder?: AppointmentSortOrder
    linkState: AppointmentListOrigin
    onSort: (column: AppointmentSortBy) => void
    onOpen: (row: AppointmentRowView) => void
    onClaim: (row: AppointmentRowView) => void
}

function AppointmentTable({
    rows,
    compact,
    texts,
    sortBy,
    sortOrder,
    linkState,
    onSort,
    onOpen,
    onClaim
}: AppointmentTableProps) {
    const { columns } = texts
    const sortable = (label: string, column: AppointmentSortBy) => (
        <AppointmentSortHeader
            label={label}
            column={column}
            sortBy={sortBy}
            sortOrder={sortOrder}
            arrows={texts.arrows}
            onSort={onSort}
        />
    )
    const actions = (
        <th scope="col">
            <span className={css.visuallyHidden}>{columns.actions}</span>
        </th>
    )

    return (
        <table
            aria-label={texts.label}
            className={compact ? `${css.table} ${css.compact}` : css.table}
        >
            <thead>
                {compact ? (
                    <tr>
                        <th scope="col">{columns.protocol}</th>
                        <th scope="col">{columns.holder}</th>
                        <th scope="col">{columns.category}</th>
                        <th scope="col">{columns.compactDatetime}</th>
                        {actions}
                    </tr>
                ) : (
                    <tr>
                        <th scope="col">{columns.protocol}</th>
                        {sortable(columns.holder, "name")}
                        <th scope="col">{columns.category}</th>
                        {sortable(columns.datetime, "appointment_datetime")}
                        <th scope="col">{columns.representative}</th>
                        {sortable(columns.responsible, "responsible")}
                        {sortable(columns.status, "status")}
                        {actions}
                    </tr>
                )}
            </thead>
            <tbody>
                {rows.map((row) =>
                    compact ? (
                        <AppointmentCompactRow
                            key={row.id}
                            row={row}
                            texts={texts.row}
                            linkState={linkState}
                            onOpen={onOpen}
                            onClaim={onClaim}
                        />
                    ) : (
                        <AppointmentRow
                            key={row.id}
                            row={row}
                            texts={texts.row}
                            linkState={linkState}
                            onOpen={onOpen}
                            onClaim={onClaim}
                        />
                    )
                )}
            </tbody>
        </table>
    )
}

export default AppointmentTable
