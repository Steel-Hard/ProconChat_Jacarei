import { AuditLogEntry } from "../../types/auditLog.types"
import { AuditLogRepository } from "../auditLog.repository.interface"

export class AuditLogStubRepository implements AuditLogRepository {
    public readonly listCalls: { area: string; limit: number }[] = []
    public entries: AuditLogEntry[] = []

    async listByArea(area: string, limit: number): Promise<AuditLogEntry[]> {
        this.listCalls.push({ area, limit })
        return this.entries
    }
}
