type ContentChange = {
    kind:
        | "categoryNew"
        | "categoryChanged"
        | "categoryState"
        | "questionNew"
        | "questionChanged"
        | "questionState"
        | "categoriesOrder"
        | "questionsOrder"
    name: string
    active?: boolean
}

export default ContentChange
