import { SaveCredentialsInput, WhatsAppSettingsRow } from "../types/whatsappSettings.types"

export interface WhatsAppSettingsRepository {
    findRow(): Promise<WhatsAppSettingsRow | null>
    ensureRow(verifyToken: string): Promise<WhatsAppSettingsRow>
    isAutoReplyPaused(): Promise<boolean>
    saveCredentials(input: SaveCredentialsInput): Promise<WhatsAppSettingsRow>
    recordCredentialsCheck(valid: boolean): Promise<void>
    setAutoReplyPaused(paused: boolean, updatedBy: number): Promise<WhatsAppSettingsRow>
}
