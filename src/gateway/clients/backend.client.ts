export interface WhatsappSessionRequest {
    phone: string
    text?: string
    providerInstance?: string
}

export interface WhatsappSessionResponse {
    sessionId: string
    newSession: boolean
    reply: { text: string; step: string }
}

export interface BackendClient {
    createWhatsappSession(input: WhatsappSessionRequest): Promise<WhatsappSessionResponse>
}

export const backendClient: BackendClient = {
    async createWhatsappSession(
        input: WhatsappSessionRequest,
    ): Promise<WhatsappSessionResponse> {
        const baseUrl = process.env.BACKEND_INTERNAL_URL
        const internalToken = process.env.GATEWAY_INTERNAL_TOKEN

        if (!baseUrl || !internalToken) {
            throw new Error("Backend internal client is not configured")
        }

        const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/whatsapp/sessions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Internal-Token": internalToken,
            },
            body: JSON.stringify(input),
            signal: AbortSignal.timeout(10_000),
        })

        if (!response.ok) {
            throw new Error(`Backend returned HTTP ${response.status}`)
        }

        const { data } = (await response.json()) as { data: WhatsappSessionResponse }
        return data
    },
}
