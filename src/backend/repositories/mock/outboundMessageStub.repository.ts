import { DeliveryFailurePage, DeliveryStatusUpdate } from "../../types/outboundMessage.types"
import { OutboundMessageRepository } from "../outboundMessage.repository.interface"

export class OutboundMessageStubRepository implements OutboundMessageRepository {
    public readonly appliedCalls: { statuses: DeliveryStatusUpdate[]; now: Date }[] = []
    public readonly failureQueries: { since: Date; limit: number }[] = []
    public failurePage: DeliveryFailurePage = { count: 0, items: [] }

    async applyStatuses(statuses: DeliveryStatusUpdate[], now: Date): Promise<void> {
        this.appliedCalls.push({ statuses, now })
    }

    async listRecentFailures(since: Date, limit: number): Promise<DeliveryFailurePage> {
        this.failureQueries.push({ since, limit })
        return this.failurePage
    }
}
