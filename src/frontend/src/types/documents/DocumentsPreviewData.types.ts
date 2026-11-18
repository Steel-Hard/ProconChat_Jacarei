import type DocumentsPreviewBlock from "@/types/documents/DocumentsPreviewBlock.types"
import type DocumentsPreviewDetail from "@/types/documents/DocumentsPreviewDetail.types"
import type DocumentsPreviewExample from "@/types/documents/DocumentsPreviewExample.types"

type DocumentsPreviewData = {
    text: string
    example: DocumentsPreviewExample
    title: string
    details: DocumentsPreviewDetail[]
    groupBlock: DocumentsPreviewBlock | null
    questionBlock: DocumentsPreviewBlock | null
    notice: string | null
    repeatedCount: number
}

export default DocumentsPreviewData
