export interface MessageDeduplicator {
    isDuplicate(id: string): boolean
    forget?(id: string): void
    clear?(): void
}

export class MemoryMessageDeduplicator implements MessageDeduplicator {
    private readonly cache = new Map<string, number>()
    private readonly ttlMs: number

    constructor(ttlMs: number) {
        this.ttlMs = ttlMs
    }

    isDuplicate(id: string): boolean {
        const now = Date.now()
        const timestamp = this.cache.get(id)
        if (timestamp && now - timestamp < this.ttlMs) {
            return true
        }
        this.cache.set(id, now)

        if (this.cache.size > 1000) {
            for (const [key, time] of this.cache.entries()) {
                if (now - time >= this.ttlMs) {
                    this.cache.delete(key)
                }
            }
        }
        return false
    }

    forget(id: string): void {
        this.cache.delete(id)
    }

    clear(): void {
        this.cache.clear()
    }
}
