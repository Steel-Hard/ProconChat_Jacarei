type ContentCategoryRowView = {
    key: string
    position: number
    shortTitle: string
    title: string
    questionsCount: number
    activeQuestionsCount: number
    state: "active" | "inactive" | "hidden"
    unsaved: boolean
    invalid: boolean
    error: string | null
    selected: boolean
    pageBreak: number | null
    canMoveUp: boolean
    canMoveDown: boolean
}

export default ContentCategoryRowView
