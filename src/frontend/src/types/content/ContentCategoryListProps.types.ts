import type ContentCategoryRowView from "@/types/content/ContentCategoryRowView.types"

type ContentCategoryListProps = {
    items: ContentCategoryRowView[]
    onSelect: (key: string) => void
    onEdit: (key: string) => void
    onToggle: (key: string) => void
    onMove: (key: string, direction: "up" | "down") => void
    onNew: () => void
}

export default ContentCategoryListProps
