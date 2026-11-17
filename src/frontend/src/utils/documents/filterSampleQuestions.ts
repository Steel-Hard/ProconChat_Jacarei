import type SampleQuestion from "@/types/documents/SampleQuestion.types"
import normalizeDocument from "@/utils/documents/normalizeDocument"

function filterSampleQuestions(questions: SampleQuestion[], term: string): SampleQuestion[] {
    const needle = normalizeDocument(term)

    if (needle === "") {
        return questions
    }

    return questions.filter((question) => normalizeDocument(question.title).includes(needle))
}

export default filterSampleQuestions
