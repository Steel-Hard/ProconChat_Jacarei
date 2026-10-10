export type WhatsappMessageResult =
    | { status: "processed"; messageId: string }
    | { status: "ignored"; reason: string; messageId?: string }

export interface WhatsappWebhookResult {
    results: WhatsappMessageResult[]
}
