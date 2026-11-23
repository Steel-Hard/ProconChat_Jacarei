export interface PrivacySettingsFields {
    controllerName: string | null
    dpoName: string | null
    contactEmail: string | null
    inPersonContact: string | null
    retentionText: string | null
    retentionEnabled: boolean
    sessionRetentionDays: number
    appointmentRetentionDays: number
}

export interface PrivacySettingsUpdatedBy {
    id: number
    name: string
}

export interface PrivacySettingsRow extends PrivacySettingsFields {
    updatedBy: PrivacySettingsUpdatedBy | null
    updatedAt: Date
}

export interface PrivacySettingsAdminView extends PrivacySettingsFields {
    updatedBy: PrivacySettingsUpdatedBy | null
    updatedAt: string | null
}

export type PrivacySettingsPublicView = PrivacySettingsFields
