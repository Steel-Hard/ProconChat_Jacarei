import type DocumentsDraftItem from "@/types/documents/DocumentsDraftItem.types"

type DocumentGroupProps = {
    title: string
    items: DocumentsDraftItem[]
    emptyAlert: string
    onAddItem: (description: string) => void
    onEditItem: (index: number, newText: string) => void
    onRemoveItem: (index: number) => void
    onMoveUp: (index: number) => void
    onMoveDown: (index: number) => void
}

export default DocumentGroupProps
