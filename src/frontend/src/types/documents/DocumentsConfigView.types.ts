import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"
import type DocumentsUpdatedBy from "@/types/documents/DocumentsUpdatedBy.types"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"

type DocumentsConfigView = DocumentsConfig & {
    updatedBy: DocumentsUpdatedBy | null
    updatedAt: string | null
    sampleQuestions: SampleQuestion[]
}

export default DocumentsConfigView
