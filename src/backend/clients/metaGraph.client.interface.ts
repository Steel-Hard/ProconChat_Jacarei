import {
    AccessTokenLifetime,
    ConnectionCheckInput,
    ConnectionCheckResult,
    MessageTemplateRef,
    MetaAuthInput,
    PhoneNumberStatusResult,
    TemplatesStatusResult,
} from "../types/whatsappSettings.types"

export interface MetaGraphClient {
    checkConnection(input: ConnectionCheckInput): Promise<ConnectionCheckResult>
    inspectAccessToken(input: ConnectionCheckInput): Promise<AccessTokenLifetime>
    listMessageTemplates(
        input: MetaAuthInput & { businessAccountId: string },
        templates: MessageTemplateRef[],
    ): Promise<TemplatesStatusResult>
    getPhoneNumberStatus(input: MetaAuthInput & { phoneNumberId: string }): Promise<PhoneNumberStatusResult>
}
