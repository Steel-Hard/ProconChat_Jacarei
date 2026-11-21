import type ContentQuestionRowView from "@/types/content/ContentQuestionRowView.types"

type ContentQuestionListProps = {
    items: ContentQuestionRowView[]
    searching: boolean
    onEdit: (categoryKey: string, key: string) => void
    onToggle: (categoryKey: string, key: string) => void
    onMove: (categoryKey: string, key: string, direction: "up" | "down") => void
    onNew: () => void
}

export default ContentQuestionListProps
