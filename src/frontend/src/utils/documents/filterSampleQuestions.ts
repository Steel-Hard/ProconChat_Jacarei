import type SampleQuestion from "@/types/documents/SampleQuestion.types"

function normalize(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

function filterSampleQuestions(questions: SampleQuestion[], term: string): SampleQuestion[] {
    const needle = normalize(term)

    if (needle === "") {
        return questions
    }

    return questions.filter((question) => normalize(question.title).includes(needle))
}

export default filterSampleQuestions
