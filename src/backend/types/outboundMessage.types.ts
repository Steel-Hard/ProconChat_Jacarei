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

export interface RecentFailureSignal {
    kind: OutboundKind
    errorCode: string
    failedAt: Date
}

export interface DeliveryProblemSignals {
    failures: RecentFailureSignal[]
    lastSuccessByKind: Partial<Record<OutboundKind, Date>>
}

export type CancellationNoticeProblemCode =
    | "PAYMENT_METHOD"
    | "TEMPLATE_NOT_FOUND"
    | "TEMPLATE_PARAMETER_COUNT"
    | "TEMPLATE_PARAMETER_FORMAT"
    | "TEMPLATE_POLICY_VIOLATION"
    | "TEMPLATE_PAUSED"
    | "TEMPLATE_DISABLED"
    | "TEMPLATE_TRANSLATION_TOO_LONG"
    | "INVALID_TOKEN"
    | "SEND_LIMIT_REACHED"

export interface CancellationNoticeProblem {
    code: CancellationNoticeProblemCode
    metaErrorCode: string | null
    message: string
}
