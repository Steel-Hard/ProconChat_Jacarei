export interface AuditLogActor {
    id: number
    name: string
}

export interface AuditLogEntry {
    id: string
    action: string
    fields: string[]
    actor: AuditLogActor | null
    createdAt: Date
}
