import { PrivacySettingsFields, PrivacySettingsRow } from "../types/privacySettings.types"

export interface PrivacySettingsRepository {
    find(): Promise<PrivacySettingsRow | null>
    save(input: PrivacySettingsFields, userId: number, now: Date): Promise<PrivacySettingsRow>
}
