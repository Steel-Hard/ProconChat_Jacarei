import { ConnectionCheckInput, ConnectionCheckResult } from "../types/whatsappSettings.types"

export interface MetaGraphClient {
    checkConnection(input: ConnectionCheckInput): Promise<ConnectionCheckResult>
}
