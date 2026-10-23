import type ReassignmentAppointmentView from "@/types/users/ReassignmentAppointmentView.types"
import css from "@/styles/components/reassignmentDialog.module.css"

type ReassignmentAppointmentItemProps = {
    appointment: ReassignmentAppointmentView
}

function ReassignmentAppointmentItem({ appointment }: ReassignmentAppointmentItemProps) {
    return (
        <li className={css.item}>
            <span className={css.protocol}>{appointment.protocol}</span>
            <span className={css.holder}>{appointment.name}</span>
            <span className={css.when}>{appointment.when}</span>
        </li>
    )
}

export default ReassignmentAppointmentItem
