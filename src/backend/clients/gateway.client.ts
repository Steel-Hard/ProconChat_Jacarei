export const GATEWAY_NOTIFY_TIMEOUT_MS = 3_000

export const GATEWAY_SEND_TIMEOUT_MS = 15_000

export type GatewayFetchFn = (
    url: string,
    init: RequestInit,
) => Promise<Pick<Response, "ok" | "status"> & Partial<Pick<Response, "json">>>

type GatewayClientEnv = Partial<Record<"GATEWAY_INTERNAL_URL" | "GATEWAY_INTERNAL_TOKEN", string>>

export interface SendTemplateInput {
    to: string
    name: string
    languageCode: string
    bodyParameters: string[]
}

export type SendTemplateResult =
    | { ok: true; providerMessageId: string | null }
    | { ok: false; reason: "NOT_CONFIGURED" | "REJECTED" | "UNREACHABLE" }

export interface GatewayClient {
    notifyConfigChanged(): Promise<void>
    sendTemplate(input: SendTemplateInput): Promise<SendTemplateResult>
}

interface GatewayClientDependencies {
    fetchFn?: GatewayFetchFn
    env?: GatewayClientEnv
    logger?: Pick<Console, "log">
    timeoutMs?: number
}

async function readProviderMessageId(response: Partial<Pick<Response, "json">>): Promise<string | null> {
    try {
        const payload = (await response.json?.()) as { data?: { providerMessageId?: unknown } } | undefined
        const id = payload?.data?.providerMessageId
        return typeof id === "string" ? id : null
    } catch {
        return null
    }
}

export function createGatewayClient({
    fetchFn = (url, init) => fetch(url, init),
    env = process.env,
    logger = console,
    timeoutMs = GATEWAY_NOTIFY_TIMEOUT_MS,
}: GatewayClientDependencies = {}): GatewayClient {
    return {
        async notifyConfigChanged() {
            const baseUrl = env.GATEWAY_INTERNAL_URL
            if (!baseUrl) {
                return
            }
            try {
                const response = await fetchFn(`${baseUrl.replace(/\/$/, "")}/internal/whatsapp/config/reload`, {
                    method: "POST",
                    headers: { "X-Internal-Token": env.GATEWAY_INTERNAL_TOKEN ?? "" },
                    signal: AbortSignal.timeout(timeoutMs),
                })
                if (!response.ok) {
                    logger.log(JSON.stringify({ event: "gateway_config_notify_failed", status: response.status }))
                }
            } catch {
                logger.log(JSON.stringify({ event: "gateway_config_notify_failed" }))
            }
        },

        async sendTemplate(input: SendTemplateInput): Promise<SendTemplateResult> {
            const baseUrl = env.GATEWAY_INTERNAL_URL
            if (!baseUrl) {
                return { ok: false, reason: "NOT_CONFIGURED" }
            }
            let response: Awaited<ReturnType<GatewayFetchFn>>
            try {
                response = await fetchFn(`${baseUrl.replace(/\/$/, "")}/internal/whatsapp/messages/template`, {
                    method: "POST",
                    headers: { "X-Internal-Token": env.GATEWAY_INTERNAL_TOKEN ?? "", "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: input.to,
                        name: input.name,
                        languageCode: input.languageCode,
                        bodyParameters: input.bodyParameters,
                    }),
                    signal: AbortSignal.timeout(GATEWAY_SEND_TIMEOUT_MS),
                })
            } catch {
                logger.log(JSON.stringify({ event: "gateway_template_send_failed" }))
                return { ok: false, reason: "UNREACHABLE" }
            }
            if (!response.ok) {
                logger.log(JSON.stringify({ event: "gateway_template_send_failed", status: response.status }))
                return { ok: false, reason: "REJECTED" }
            }
            return { ok: true, providerMessageId: await readProviderMessageId(response) }
        },
    }
}

export const gatewayClient = createGatewayClient()
