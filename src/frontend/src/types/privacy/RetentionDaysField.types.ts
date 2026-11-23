import type RetentionDaysKey from "@/types/privacy/RetentionDaysKey.types"

type RetentionDaysField = {
    key: RetentionDaysKey
    label: string
    hint: string
    hintLabel: string
    value: string
    min: number
    max: number
    error: string | null
    changed: boolean
}

export default RetentionDaysField
