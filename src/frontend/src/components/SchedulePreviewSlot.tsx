import { useTranslation } from "react-i18next"
import SCHEDULE_PREVIEW_STATUS from "@/status/schedulePreviewStatusStyles"
import type DaySlotPreview from "@/types/schedule/DaySlotPreview.types"
import css from "@/styles/components/schedulePreview.module.css"

type SchedulePreviewSlotProps = {
    slot: DaySlotPreview
}

function SchedulePreviewSlot({ slot }: SchedulePreviewSlotProps) {
    const { t } = useTranslation("schedule")
    const seats =
        slot.freeSeats > 0
            ? t("preview.detail.slotFree", { free: slot.freeSeats, capacity: slot.capacity })
            : t("preview.detail.slotFull")
    const text = slot.past
        ? t("preview.detail.slotPast")
        : slot.offered
          ? seats
          : t("preview.detail.slotNotOfferedWith", { seats })
    const status =
        slot.past || !slot.offered ? "NO_SERVICE" : slot.freeSeats > 0 ? "AVAILABLE" : "FULL"
    const style = SCHEDULE_PREVIEW_STATUS[status]

    return (
        <li
            className={css.slot}
            style={{ background: style.bg, color: style.fg, borderColor: style.border }}
        >
            <span className={css.slotTime}>{slot.time}</span>
            <span className={css.slotSeats}>{text}</span>
        </li>
    )
}

export default SchedulePreviewSlot
