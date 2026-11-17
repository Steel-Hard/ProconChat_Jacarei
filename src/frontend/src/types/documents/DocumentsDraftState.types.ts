import type DocumentsConfig from "@/types/documents/DocumentsConfig.types"

type DocumentsDraftState = {
    serverConfig: DocumentsConfig | null | undefined
    holder: string[]
    representative: string[]
    log: string[]
}

export default DocumentsDraftState
