import AppointmentClaimButton from "@/components/AppointmentClaimButton"
import AppointmentProtocolLink from "@/components/AppointmentProtocolLink"
import Seal from "@/components/Seal"
import StatusBadge from "@/components/StatusBadge"
import type AppointmentListOrigin from "@/types/appointments/AppointmentListOrigin.types"
import type AppointmentRowTexts from "@/types/appointments/AppointmentRowTexts.types"
import type AppointmentRowView from "@/types/appointments/AppointmentRowView.types"
import css from "@/styles/components/appointmentTable.module.css"

type AppointmentRowProps = {
    row: AppointmentRowView
    texts: AppointmentRowTexts
    linkState: AppointmentListOrigin
    onOpen: (row: AppointmentRowView) => void
    onClaim: (row: AppointmentRowView) => void
}

function AppointmentRow({ row, texts, linkState, onOpen, onClaim }: AppointmentRowProps) {
    return (
        <tr className={css.row} onClick={() => onOpen(row)}>
            <td>
                <AppointmentProtocolLink
                    protocol={row.protocol}
                    to={row.detailPath}
                    state={linkState}
                />
            </td>
            <td>
                <div className={css.stack}>
                    <span className={css.name}>{row.name}</span>
                    <span className={css.cpf}>{row.cpfMasked}</span>
                    {row.offGrid ? <Seal label={texts.offGrid} tone="warning" /> : null}
                </div>
            </td>
            <td>
                <div className={css.category}>{row.category}</div>
                <div className={css.question}>{row.question}</div>
            </td>
            <td>
                <div className={css.day}>{row.dayLabel}</div>
                <strong>{row.timeLabel}</strong>
            </td>
            <td>
                {row.representative ? (
                    <Seal label={texts.yes} />
                ) : (
                    <span className={css.no}>{texts.no}</span>
                )}
            </td>
            <td className={row.unassigned ? css.unassigned : css.responsible}>
                {row.responsibleLabel}
            </td>
            <td>
                <StatusBadge kind="appointment" status={row.status} />
            </td>
            <td className={css.actions}>
                {row.canClaim ? (
                    <AppointmentClaimButton
                        label={texts.claim}
                        disabled={row.claiming}
                        onClaim={() => onClaim(row)}
                    />
                ) : null}
            </td>
        </tr>
    )
}

export default AppointmentRow
