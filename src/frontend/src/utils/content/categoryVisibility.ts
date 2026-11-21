type ActiveFlag = { active: boolean }

type CategoryCounts = {
    questionsCount: number
    activeQuestionsCount: number
}

export function categoryCountsOf(questions: ActiveFlag[]): CategoryCounts {
    return {
        questionsCount: questions.length,
        activeQuestionsCount: questions.filter((question) => question.active).length
    }
}

export function isCategoryVisibleInChatbot(category: ActiveFlag, questions: ActiveFlag[]): boolean {
    return category.active && questions.some((question) => question.active)
}

export function isCategoryHiddenInChatbot(category: ActiveFlag, questions: ActiveFlag[]): boolean {
    return category.active && !questions.some((question) => question.active)
}
