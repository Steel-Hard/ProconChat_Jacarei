import type { RecordedConversationEvent, ScheduleOfferReason } from "../types/conversationEvent.types"

export function offeredReasonOf(events: RecordedConversationEvent[]): ScheduleOfferReason | null {
    let reason: ScheduleOfferReason | null = null

    for (const event of events) {
        if (event.type === "QUESTION_CHOSEN") {
            reason = null
        } else if (event.type === "SCHEDULE_OFFERED") {
            reason = event.reason
        }
    }

    return reason
}
