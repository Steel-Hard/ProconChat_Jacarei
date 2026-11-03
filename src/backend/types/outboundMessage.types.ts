export type OutboundKind = "REPLY" | "CONFIRMATION" | "PAUSED" | "CANCELLATION" | "REMINDER"

export type OutboundStatus = "SENT" | "DELIVERED" | "READ" | "FAILED"

export interface DeliveryStatusUpdate {
    providerMessageId: string
    status: OutboundStatus
    statusAt: Date | null
    errorCode: string | null
}

export interface DeliveryFailure {
    id: string
    kind: OutboundKind
    errorCode: string | null
    failedAt: Date
    appointmentId: string | null
}

export interface DeliveryFailurePage {
    count: number
    items: DeliveryFailure[]
}
