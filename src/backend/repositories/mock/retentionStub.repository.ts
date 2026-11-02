import { RetentionCounts, RetentionRepository, RetentionWindow } from "../retention.repository"

export class RetentionStubRepository implements RetentionRepository {
    public counts: RetentionCounts = { sessions: 0, appointments: 0 }
    public readonly countDueCalls: RetentionWindow[] = []
    public readonly anonymizeDueCalls: (RetentionWindow & { limit: number })[] = []

    async countDue(window: RetentionWindow): Promise<RetentionCounts> {
        this.countDueCalls.push(window)
        return { ...this.counts }
    }

    async anonymizeDue(window: RetentionWindow & { limit: number }): Promise<RetentionCounts> {
        this.anonymizeDueCalls.push(window)
        return { ...this.counts }
    }
}
