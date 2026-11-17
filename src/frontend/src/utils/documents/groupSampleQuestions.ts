import type SampleQuestion from "@/types/documents/SampleQuestion.types"
import type SampleQuestionGroup from "@/types/documents/SampleQuestionGroup.types"

function groupSampleQuestions(questions: SampleQuestion[]): SampleQuestionGroup[] {
    const groups: SampleQuestionGroup[] = []

    for (const question of questions) {
        const last = groups[groups.length - 1]

        if (last !== undefined && last.categoryTitle === question.categoryTitle) {
            last.questions.push(question)
        } else {
            groups.push({ categoryTitle: question.categoryTitle, questions: [question] })
        }
    }

    return groups
}

export default groupSampleQuestions
