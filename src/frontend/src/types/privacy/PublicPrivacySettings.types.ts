import type PrivacyFieldKey from "@/types/privacy/PrivacyFieldKey.types"

type PublicPrivacySettings = Record<PrivacyFieldKey, string | null> & {
    retentionEnabled: boolean
    sessionRetentionDays: number
    appointmentRetentionDays: number
}

export default PublicPrivacySettings
