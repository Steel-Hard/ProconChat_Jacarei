import type DayPreviewStatus from "@/types/schedule/DayPreviewStatus.types"
import type DayPreviewStatusStyle from "@/types/schedule/DayPreviewStatusStyle.types"

const CLOSED: DayPreviewStatusStyle = { bg: "#F7F6FA", fg: "#8A869C", border: "#ECEAF2" }

const SCHEDULE_PREVIEW_STATUS: Record<DayPreviewStatus, DayPreviewStatusStyle> = {
    AVAILABLE: { bg: "#EEEBFA", fg: "#2E2757", border: "#C9C2E6" },
    FULL: { bg: "#FCEFD6", fg: "#7A4F00", border: "#E9C98A" },
    BEFORE_MIN_NOTICE: {
        bg: "repeating-linear-gradient(135deg, #F1EFF6 0 4px, #E4E1EE 4px 8px)",
        fg: "#55516A",
        border: "#E4E1EE"
    },
    BLOCKED: { bg: "#FAE3E0", fg: "#8E2C22", border: "#EBC7C2" },
    NO_SERVICE: CLOSED,
    OUTSIDE_WINDOW: CLOSED,
    PAST: CLOSED,
    CLOSED_TODAY: CLOSED
}

export default SCHEDULE_PREVIEW_STATUS
