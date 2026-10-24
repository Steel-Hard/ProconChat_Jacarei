import { useTranslation } from "react-i18next"
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
    const tone = slot.past || !slot.offered ? css.slotOff : slot.freeSeats > 0 ? "" : css.slotFull

    return (
        <li className={`${css.slot} ${tone}`.trim()}>
            <span className={css.slotTime}>{slot.time}</span>
            <span className={css.slotSeats}>{text}</span>
        </li>
    )
}

export default SchedulePreviewSlot
