export interface SendTextInput {
    instance: string
    number: string
    text: string
}

export interface MessageGateway {
    sendText(input: SendTextInput): Promise<void>
}

export const evolutionGateway: MessageGateway = {
    async sendText({ instance, number, text }: SendTextInput): Promise<void> {
        const baseUrl = process.env.EVOLUTION_API_URL
        const apiKey = process.env.EVOLUTION_API_KEY

        if (!baseUrl || !apiKey) {
            throw new Error("Evolution API is not configured")
        }

        const response = await fetch(
            `${baseUrl.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(instance)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: apiKey,
                },
                body: JSON.stringify({ number, text }),
                signal: AbortSignal.timeout(10_000),
            },
        )

        if (!response.ok) {
            throw new Error(`Evolution API returned HTTP ${response.status}`)
        }
    },
}
