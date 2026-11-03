export interface IncomingMessage {
    id: string
    from: string
    timestampMs?: number
    text?: string
    optionId?: string
}

export type DeliveryStatusValue = "sent" | "delivered" | "read" | "failed"

export interface DeliveryStatus {
    providerMessageId: string
    status: DeliveryStatusValue
    timestamp: number | null
    errorCode: string | null
}

export interface ListRow {
    id: string
    title: string
    description?: string
}

export interface ReplyButton {
    id: string
    title: string
}

export type OutgoingMessage =
    | { type: "text"; text: string }
    | { type: "list"; text: string; buttonText: string; rows: ListRow[]; footer?: string }
    | { type: "buttons"; text: string; buttons: ReplyButton[]; footer?: string }

export interface OutgoingTemplate {
    name: string
    languageCode: string
    bodyParameters: string[]
}

export interface OutgoingTemplateRequest {
    to: string
    template: OutgoingTemplate
}
