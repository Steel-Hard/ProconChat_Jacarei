import {
    AccessTokenLifetime,
    ConnectionCheckInput,
    ConnectionCheckResult,
    MessageTemplateRef,
    MetaAuthInput,
    PhoneNumberStatusResult,
    TemplatesStatusResult,
} from "../types/whatsappSettings.types"
import { MetaGraphClient } from "./metaGraph.client.interface"

export class MockMetaGraphClient implements MetaGraphClient {
    public readonly calls: ConnectionCheckInput[] = []
    public readonly inspectCalls: ConnectionCheckInput[] = []
    public readonly templateCalls: { input: MetaAuthInput & { businessAccountId: string }; templates: MessageTemplateRef[] }[] = []
    public readonly phoneStatusCalls: (MetaAuthInput & { phoneNumberId: string })[] = []

    private nextTemplates: TemplatesStatusResult = { ok: true, templates: [] }

    private nextPhoneStatus: PhoneNumberStatusResult = { ok: true, qualityRating: "HIGH", tier: "TIER_250", dailyLimit: 250 }

    private nextResult: ConnectionCheckResult = {
        ok: true,
        displayPhoneNumber: "+55 12 99999-0000",
        verifiedName: "PROCON Jacareí",
    }

    private nextLifetime: AccessTokenLifetime = { kind: "PERMANENT", expiresAt: null }

    respondWith(result: ConnectionCheckResult): void {
        this.nextResult = result
    }

    respondToInspectionWith(lifetime: AccessTokenLifetime): void {
        this.nextLifetime = lifetime
    }

    respondToTemplatesWith(result: TemplatesStatusResult): void {
        this.nextTemplates = result
    }

    respondToPhoneStatusWith(result: PhoneNumberStatusResult): void {
        this.nextPhoneStatus = result
    }

    async checkConnection(input: ConnectionCheckInput): Promise<ConnectionCheckResult> {
        this.calls.push({ ...input })
        return this.nextResult
    }

    async inspectAccessToken(input: ConnectionCheckInput): Promise<AccessTokenLifetime> {
        this.inspectCalls.push({ ...input })
        return this.nextLifetime
    }

    async listMessageTemplates(
        input: MetaAuthInput & { businessAccountId: string },
        templates: MessageTemplateRef[],
    ): Promise<TemplatesStatusResult> {
        this.templateCalls.push({ input: { ...input }, templates: [...templates] })
        return this.nextTemplates
    }

    async getPhoneNumberStatus(input: MetaAuthInput & { phoneNumberId: string }): Promise<PhoneNumberStatusResult> {
        this.phoneStatusCalls.push({ ...input })
        return this.nextPhoneStatus
    }
}
