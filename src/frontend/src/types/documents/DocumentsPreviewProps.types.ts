import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"
import type DocumentsPreviewData from "@/types/documents/DocumentsPreviewData.types"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"

type DocumentsPreviewProps = {
    attendeeGroup: AttendeeGroup
    onChangeAttendeeGroup: (group: AttendeeGroup) => void
    sampleQuestions: SampleQuestion[]
    selectedQuestionId: string
    onChangeQuestionId: (id: string) => void
    preview: DocumentsPreviewData | null
    hasPreviewError: boolean
    isUnsaved: boolean
    isQuestionEmpty: boolean
    isUpdating: boolean
}

export default DocumentsPreviewProps
