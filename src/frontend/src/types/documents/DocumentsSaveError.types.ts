import type DocumentsSaveErrorKind from "@/types/documents/DocumentsSaveErrorKind.types"
import type DocumentsSaveIssue from "@/types/documents/DocumentsSaveIssue.types"

type DocumentsSaveError = {
    kind: DocumentsSaveErrorKind
    issues: DocumentsSaveIssue[]
}

export default DocumentsSaveError
