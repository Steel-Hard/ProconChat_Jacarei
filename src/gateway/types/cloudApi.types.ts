export interface CloudApiConfig {
    phoneNumberId: string
    accessToken: string
    appSecret: string
    graphApiVersion: string
}

export interface CloudApiIncomingMessage {
    id?: string
    from?: string
    timestamp?: string | number
    type?: string
    text?: { body?: string }
    interactive?: {
        type?: string
        list_reply?: { id?: string; title?: string; description?: string }
        button_reply?: { id?: string; title?: string }
    }
}

export interface CloudApiStatus {
    id?: string
    status?: string
}

export interface CloudApiChangeValue {
    messaging_product?: string
    metadata?: { display_phone_number?: string; phone_number_id?: string }
    messages?: CloudApiIncomingMessage[]
    statuses?: CloudApiStatus[]
}

export interface CloudApiChange {
    field?: string
    value?: CloudApiChangeValue
}

export interface CloudApiEntry {
    id?: string
    changes?: CloudApiChange[]
}

export interface CloudApiWebhookPayload {
    object?: string
    entry?: CloudApiEntry[]
}

interface CloudApiOutgoingBase {
    messaging_product: "whatsapp"
    recipient_type: "individual"
    to: string
}

export interface CloudApiTextBody extends CloudApiOutgoingBase {
    type: "text"
    text: { body: string; preview_url: false }
}

export interface CloudApiListBody extends CloudApiOutgoingBase {
    type: "interactive"
    interactive: {
        type: "list"
        body: { text: string }
        action: {
            button: string
            sections: { rows: { id: string; title: string; description?: string }[] }[]
        }
    }
}

export interface CloudApiButtonsBody extends CloudApiOutgoingBase {
    type: "interactive"
    interactive: {
        type: "button"
        body: { text: string }
        action: { buttons: { type: "reply"; reply: { id: string; title: string } }[] }
    }
}

export type CloudApiOutgoingBody = CloudApiTextBody | CloudApiListBody | CloudApiButtonsBody
