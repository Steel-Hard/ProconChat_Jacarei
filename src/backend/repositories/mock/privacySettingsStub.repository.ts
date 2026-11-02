import { PrivacySettingsFields, PrivacySettingsRow } from "../../types/privacySettings.types"
import { PrivacySettingsRepository } from "../privacySettings.repository.interface"

export class PrivacySettingsStubRepository implements PrivacySettingsRepository {
    public row: PrivacySettingsRow | null = null
    public findError: Error | null = null
    public readonly saveCalls: { input: PrivacySettingsFields; userId: number; now: Date }[] = []

    async find(): Promise<PrivacySettingsRow | null> {
        if (this.findError) {
            throw this.findError
        }
        return this.row
    }

    async save(input: PrivacySettingsFields, userId: number, now: Date): Promise<PrivacySettingsRow> {
        this.saveCalls.push({ input, userId, now })
        this.row = { ...input, updatedBy: { id: userId, name: "" }, updatedAt: now }
        return this.row
    }
}
