import { CloudApiConfig } from "../types/cloudApi.types"

export const DEFAULT_GRAPH_API_VERSION = "v26.0"

export interface WhatsAppConfig extends CloudApiConfig {
    verifyToken: string
}

export function readWhatsAppConfigFromEnv(): WhatsAppConfig {
    return {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
        appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
        graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION,
    }
}
