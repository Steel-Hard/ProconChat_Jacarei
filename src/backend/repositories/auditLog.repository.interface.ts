import { AuditLogEntry } from "../types/auditLog.types"

export interface AuditLogRepository {
    listByArea(area: string, limit: number): Promise<AuditLogEntry[]>
}
