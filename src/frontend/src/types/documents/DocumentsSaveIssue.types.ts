import type AttendeeGroup from "@/types/documents/AttendeeGroup.types"

type DocumentsSaveIssue = {
    group: AttendeeGroup | null
    position: number | null
    message: string
}

export default DocumentsSaveIssue
