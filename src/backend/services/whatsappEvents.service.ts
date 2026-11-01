import BadRequestError from "../errors/BadRequestError"
import { outboundMessageRepository } from "../repositories/outboundMessage.repository"
import { OutboundMessageRepository } from "../repositories/outboundMessage.repository.interface"
import { whatsappSettingsRepository } from "../repositories/whatsappSettings.repository"
import { WhatsAppSettingsRepository } from "../repositories/whatsappSettings.repository.interface"
import { DeliveryStatusUpdate, OutboundStatus } from "../types/outboundMessage.types"

interface WhatsAppEventsDependencies {
    settings: Pick<WhatsAppSettingsRepository, "touchLastWebhookEvent">
    outbound: Pick<OutboundMessageRepository, "applyStatuses">
    now?: () => Date
}

interface IncomingStatus {
    providerMessageId: string
    status: string
    timestamp: number | null
    errorCode: string | null
}

export type RecordWhatsAppEvents = (body: unknown) => Promise<void>

const PROVIDER_MESSAGE_ID_MAX = 128
const ERROR_CODE_MAX = 40
const TIMESTAMP_MAX = 253402300799
const DELIVERY_STATUSES: readonly string[] = ["sent", "delivered", "read", "failed"]

function isValidTimestamp(value: unknown): value is number | null {
    return value === null || (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= TIMESTAMP_MAX)
}

function isValidStatus(value: unknown): value is IncomingStatus {
    if (typeof value !== "object" || value === null) {
        return false
    }
    const { providerMessageId, status, timestamp, errorCode } = value as Record<string, unknown>
    return (
        typeof providerMessageId === "string" &&
        providerMessageId !== "" &&
        providerMessageId.length <= PROVIDER_MESSAGE_ID_MAX &&
        typeof status === "string" &&
        DELIVERY_STATUSES.includes(status) &&
        isValidTimestamp(timestamp) &&
        (errorCode === null || (typeof errorCode === "string" && errorCode.length <= ERROR_CODE_MAX))
    )
}

function parseStatuses(body: unknown): IncomingStatus[] {
    const statuses = typeof body === "object" && body !== null ? (body as { statuses?: unknown }).statuses : undefined
    if (!Array.isArray(statuses) || !statuses.every(isValidStatus)) {
        throw new BadRequestError("Invalid WhatsApp events body")
    }
    return statuses
}

function toUpdate(status: IncomingStatus): DeliveryStatusUpdate {
    return {
        providerMessageId: status.providerMessageId,
        status: status.status.toUpperCase() as OutboundStatus,
        statusAt: status.timestamp === null ? null : new Date(status.timestamp * 1000),
        errorCode: status.errorCode,
    }
}

export function createWhatsAppEventsService({
    settings,
    outbound,
    now = () => new Date(),
}: WhatsAppEventsDependencies): RecordWhatsAppEvents {
    return async (body) => {
        const statuses = parseStatuses(body).map(toUpdate)
        const at = now()
        await settings.touchLastWebhookEvent(at)
        if (statuses.length > 0) {
            await outbound.applyStatuses(statuses, at)
        }
    }
}

export const recordWhatsAppEvents = createWhatsAppEventsService({
    settings: whatsappSettingsRepository,
    outbound: outboundMessageRepository,
})
