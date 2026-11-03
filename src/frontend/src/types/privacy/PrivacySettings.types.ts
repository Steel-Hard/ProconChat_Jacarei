import type PublicPrivacySettings from "@/types/privacy/PublicPrivacySettings.types"

type PrivacySettings = PublicPrivacySettings & {
    updatedBy: { id: number; name: string } | null
    updatedAt: string | null
}

export default PrivacySettings
