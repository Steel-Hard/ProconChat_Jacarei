import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"

type DocumentsConfigView = DocumentsConfig & {
    updatedBy: { id: number; name: string } | null
    updatedAt: string | null
    unitAddress?: string
    unitAddressComplement?: string | null
    reminderEnabled?: boolean
    reminderHours?: number
    sampleQuestions?: SampleQuestion[]
}

export default DocumentsConfigView
