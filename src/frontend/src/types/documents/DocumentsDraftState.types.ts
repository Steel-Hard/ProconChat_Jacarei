import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"
import type DocumentsDraftItem from "@/types/documents/DocumentsDraftItem.types"

type DocumentsDraftState = {
    serverConfig: DocumentsConfig | null | undefined
    holder: DocumentsDraftItem[]
    representative: DocumentsDraftItem[]
}

export default DocumentsDraftState
