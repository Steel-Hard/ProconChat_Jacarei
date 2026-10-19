import { CloudApiConfig } from "../types/cloudApi.types"

export interface WhatsAppConfig extends CloudApiConfig {
    verifyToken: string
}
