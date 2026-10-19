import { backendClient, BackendClient } from "../clients/backend.client"
import ServiceUnavailableError from "../errors/ServiceUnavailableError"
import { WhatsAppConfig } from "../utils/whatsappConfig"

const DEFAULT_TTL_MS = 60_000
const UNAVAILABLE_MESSAGE = "WhatsApp configuration is unavailable"

export interface WhatsAppConfigStore {
    load(): Promise<WhatsAppConfig>
    current(): WhatsAppConfig
    invalidate(): void
}

interface WhatsAppConfigStoreDependencies {
    backend: Pick<BackendClient, "getWhatsappConfig">
    ttlMs?: number
    now?: () => number
    logger?: Pick<Console, "log">
}

export function createWhatsAppConfigStore({
    backend,
    ttlMs = DEFAULT_TTL_MS,
    now = Date.now,
    logger = console,
}: WhatsAppConfigStoreDependencies): WhatsAppConfigStore {
    let cached: WhatsAppConfig | undefined
    let loadedAt = 0
    let stale = true
    let inFlight: Promise<WhatsAppConfig> | undefined
    let generation = 0

    function isFresh(): boolean {
        return cached !== undefined && !stale && now() - loadedAt < ttlMs
    }

    async function refresh(): Promise<WhatsAppConfig> {
        const startedAt = generation
        try {
            const config = await backend.getWhatsappConfig()
            const isCurrent = startedAt === generation
            if (isCurrent || !cached) {
                cached = config
                loadedAt = now()
                stale = !isCurrent
            }
            return cached
        } catch {
            logger.log(JSON.stringify({ event: "whatsapp_config_refresh_failed" }))
            if (cached) {
                return cached
            }
            throw new ServiceUnavailableError(UNAVAILABLE_MESSAGE)
        }
    }

    return {
        load() {
            if (isFresh() && cached) {
                return Promise.resolve(cached)
            }
            if (!inFlight) {
                const current = refresh().finally(() => {
                    if (inFlight === current) {
                        inFlight = undefined
                    }
                })
                inFlight = current
            }
            return inFlight
        },

        current() {
            if (!cached) {
                throw new ServiceUnavailableError(UNAVAILABLE_MESSAGE)
            }
            return cached
        },

        invalidate() {
            generation += 1
            stale = true
            inFlight = undefined
        },
    }
}

export const whatsappConfigStore = createWhatsAppConfigStore({ backend: backendClient })
