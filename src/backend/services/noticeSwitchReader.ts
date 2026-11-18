import { conversationEventFailureLog, ConversationEventLogger } from "../utils/conversationEventLog"

export function createSafeNoticeReader(
    isEnabled: () => Promise<boolean>,
    logger: ConversationEventLogger,
): (sessionId: string) => Promise<boolean> {
    return async (sessionId) => {
        try {
            return await isEnabled()
        } catch (err: unknown) {
            logger.error(
                "Failed to read cancellation notice switch",
                conversationEventFailureLog(sessionId, { type: "APPOINTMENT_CONSULTED" }, err),
            )
            return false
        }
    }
}
