import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"

type CancellationNoticeOutcome = "ok" | "failed" | "noPhone" | "disabled"

function cancellationNoticeOutcomeOf(detail: AppointmentDetail): CancellationNoticeOutcome {
    if (detail.status !== "CANCELED") {
        return "ok"
    }

    if (detail.cancellation_notice_status === "DISABLED") {
        return "disabled"
    }

    if (detail.cancellation_notice_status === "NOTIFIED") {
        return "ok"
    }

    const retry = detail.available_actions.retry_cancellation_notice

    if (retry.allowed) {
        return "failed"
    }

    return retry.code === "CITIZEN_PHONE_UNAVAILABLE" ? "noPhone" : "ok"
}

export default cancellationNoticeOutcomeOf
