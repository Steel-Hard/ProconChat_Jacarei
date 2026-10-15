import { AccessTokenLifetime, SaveCredentialsInput, VerifiedPhoneNumber, WhatsAppSettingsRow } from "../../types/whatsappSettings.types"
import { WhatsAppSettingsRepository } from "../whatsappSettings.repository.interface"

export class MockWhatsAppSettingsRepository implements WhatsAppSettingsRepository {
    public row: WhatsAppSettingsRow | null
    public readonly credentialChecks: boolean[] = []
    public saveCalls = 0

    private readonly userNames = new Map<number, string>()
    private readonly clock: () => Date

    constructor(row: Partial<WhatsAppSettingsRow> | null = null, clock: () => Date = () => new Date()) {
        this.clock = clock
        this.row = row === null ? null : { ...this.emptyRow("0".repeat(64)), ...row }
    }

    addUser(id: number, name: string): void {
        this.userNames.set(id, name)
    }

    async findRow(): Promise<WhatsAppSettingsRow | null> {
        return this.row ? { ...this.row } : null
    }

    async ensureRow(verifyToken: string): Promise<WhatsAppSettingsRow> {
        if (!this.row) {
            this.row = this.emptyRow(verifyToken)
        }
        return { ...this.row }
    }

    async isAutoReplyPaused(): Promise<boolean> {
        return this.row?.autoReplyPaused ?? false
    }

    async saveCredentials(input: SaveCredentialsInput): Promise<WhatsAppSettingsRow> {
        const row = this.requireRow()
        this.saveCalls += 1
        this.row = {
            ...row,
            phoneNumberId: input.phoneNumberId,
            businessAccountId: input.businessAccountId,
            accessTokenEncrypted: input.accessTokenEncrypted,
            appSecretEncrypted: input.appSecretEncrypted,
            credentialsValid: true,
            credentialsCheckedAt: this.clock(),
            displayPhoneNumber: input.displayPhoneNumber,
            verifiedName: input.verifiedName,
            accessTokenLifetime: input.accessTokenLifetime ?? row.accessTokenLifetime,
            updatedBy: this.userOf(input.updatedBy),
            updatedAt: this.clock(),
        }
        return { ...this.row }
    }

    async recordCredentialsCheck(valid: boolean, verified?: VerifiedPhoneNumber, lifetime?: AccessTokenLifetime): Promise<void> {
        const row = this.requireRow()
        this.credentialChecks.push(valid)
        this.row = {
            ...row,
            ...verified,
            accessTokenLifetime: lifetime ?? row.accessTokenLifetime,
            credentialsValid: valid,
            credentialsCheckedAt: this.clock(),
        }
    }

    async setAutoReplyPaused(paused: boolean, updatedBy: number): Promise<WhatsAppSettingsRow> {
        const row = this.requireRow()
        this.row = { ...row, autoReplyPaused: paused, updatedBy: this.userOf(updatedBy), updatedAt: this.clock() }
        return { ...this.row }
    }

    private userOf(id: number): { id: number; name: string } {
        return { id, name: this.userNames.get(id) ?? "Admin" }
    }

    private requireRow(): WhatsAppSettingsRow {
        if (!this.row) {
            throw new Error("WhatsAppSettings row not found")
        }
        return this.row
    }

    private emptyRow(verifyToken: string): WhatsAppSettingsRow {
        return {
            phoneNumberId: null,
            businessAccountId: null,
            accessTokenEncrypted: null,
            appSecretEncrypted: null,
            verifyToken,
            autoReplyPaused: false,
            credentialsCheckedAt: null,
            credentialsValid: null,
            displayPhoneNumber: null,
            verifiedName: null,
            accessTokenLifetime: { kind: "UNKNOWN", expiresAt: null },
            updatedBy: null,
            updatedAt: this.clock(),
        }
    }
}
