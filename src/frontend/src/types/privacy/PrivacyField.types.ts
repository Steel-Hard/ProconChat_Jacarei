import type PrivacyFieldKey from "@/types/privacy/PrivacyFieldKey.types"

type PrivacyField = {
    key: PrivacyFieldKey
    label: string
    value: string
    error: string | null
    changed: boolean
    multiline: boolean
}

export default PrivacyField
