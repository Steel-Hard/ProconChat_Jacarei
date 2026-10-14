export const GATEWAY_NOTIFY_TIMEOUT_MS = 3_000

export type GatewayFetchFn = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status">>

type GatewayClientEnv = Partial<Record<"GATEWAY_INTERNAL_URL" | "GATEWAY_INTERNAL_TOKEN", string>>

export interface GatewayClient {
    notifyConfigChanged(): Promise<void>
}

interface GatewayClientDependencies {
    fetchFn?: GatewayFetchFn
    env?: GatewayClientEnv
    logger?: Pick<Console, "log">
    timeoutMs?: number
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
    }
}

export const gatewayClient = createGatewayClient()
