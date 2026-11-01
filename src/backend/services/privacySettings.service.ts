import { privacySettingsRepository } from "../repositories/privacySettings.repository"
import { PrivacySettingsRepository } from "../repositories/privacySettings.repository.interface"
import {
    PrivacySettingsAdminView,
    PrivacySettingsFields,
    PrivacySettingsPublicView,
    PrivacySettingsRow,
} from "../types/privacySettings.types"
import { privacyPolicyUrlFrom } from "../utils/privacyPolicyUrl"

interface PrivacySettingsDependencies {
    repository: PrivacySettingsRepository
    clock?: () => Date
}

export interface PrivacySettingsService {
    getAdminView(): Promise<PrivacySettingsAdminView>
    getPublicView(): Promise<PrivacySettingsPublicView>
    save(input: PrivacySettingsFields, userId: number): Promise<PrivacySettingsAdminView>
}

const EMPTY_FIELDS: PrivacySettingsFields = {
    controllerName: null,
    dpoName: null,
    contactEmail: null,
    inPersonContact: null,
    retentionText: null,
}

function fieldsOf(row: PrivacySettingsFields | null): PrivacySettingsFields {
    if (!row) {
        return { ...EMPTY_FIELDS }
    }
    return {
        controllerName: row.controllerName,
        dpoName: row.dpoName,
        contactEmail: row.contactEmail,
        inPersonContact: row.inPersonContact,
        retentionText: row.retentionText,
    }
}

function adminViewOf(row: PrivacySettingsRow | null): PrivacySettingsAdminView {
    return {
        ...fieldsOf(row),
        updatedBy: row?.updatedBy ?? null,
        updatedAt: row ? row.updatedAt.toISOString() : null,
    }
}

interface GreetingPrivacyLinkInput {
    baseUrl: string | undefined
    settings: PrivacySettingsFields | null
}

export function greetingPrivacyLink({ baseUrl, settings }: GreetingPrivacyLinkInput): string | null {
    if (!settings?.controllerName || !settings.contactEmail) {
        return null
    }
    return privacyPolicyUrlFrom(baseUrl)
}

interface PrivacyLinkLogger {
    error(message: string, ...details: unknown[]): void
}

interface PrivacyLinkProviderDependencies {
    settings: PrivacySettingsRepository
    baseUrl: string | undefined
    logger: PrivacyLinkLogger
}

export function createPrivacyLinkProvider({
    settings,
    baseUrl,
    logger,
}: PrivacyLinkProviderDependencies): () => Promise<string | null> {
    return async () => {
        if (privacyPolicyUrlFrom(baseUrl) === null) {
            return null
        }
        try {
            return greetingPrivacyLink({ baseUrl, settings: await settings.find() })
        } catch (error) {
            logger.error("Failed to read privacy settings", { code: error instanceof Error ? error.name : "UNKNOWN" })
            return null
        }
    }
}

export function createPrivacySettingsService({
    repository,
    clock = () => new Date(),
}: PrivacySettingsDependencies): PrivacySettingsService {
    return {
        getAdminView: async () => adminViewOf(await repository.find()),
        getPublicView: async () => fieldsOf(await repository.find()),
        save: async (input, userId) => adminViewOf(await repository.save(fieldsOf(input), userId, clock())),
    }
}

export const privacySettingsService = createPrivacySettingsService({ repository: privacySettingsRepository })
