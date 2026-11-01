import { DeliveryFailurePage, DeliveryStatusUpdate } from "../types/outboundMessage.types"

export interface OutboundMessageRepository {
    applyStatuses(statuses: DeliveryStatusUpdate[], now: Date): Promise<void>
    listRecentFailures(since: Date, limit: number): Promise<DeliveryFailurePage>
}
