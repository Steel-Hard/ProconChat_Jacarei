import { privacySettingsRepository } from "../repositories/privacySettings.repository"
import { PrivacySettingsRepository } from "../repositories/privacySettings.repository.interface"
import {
    PrivacySettingsAdminView,
    PrivacySettingsFields,
    PrivacySettingsPublicView,
    PrivacySettingsRow,
} from "../types/privacySettings.types"

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
