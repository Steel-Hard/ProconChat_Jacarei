import type ContentPreviewArgs from "@/types/content/ContentPreviewArgs.types"
import type ContentPreviewListRowInput from "@/types/content/ContentPreviewListRowInput.types"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"

function nullIfEmpty(value: string): string | null {
    const trimmed = value.trim()

    return trimmed === "" ? null : trimmed
}

export default function buildPreviewArgs(
    categoryId: number,
    questionId: number | null,
    fields: ContentQuestionFormFields,
    listRows: ContentPreviewListRowInput[]
): ContentPreviewArgs {
    const args: ContentPreviewArgs = {
        categoryId,
        shortTitle: fields.shortTitle.trim(),
        shortDescription: nullIfEmpty(fields.shortDescription),
        question: fields.question.trim(),
        answer: fields.answer.trim(),
        legalBasis: nullIfEmpty(fields.legalBasis),
        requiredDocuments: fields.requiredDocuments.map((document) => document.trim()),
        requiresInPerson: fields.requiresInPerson,
        inPersonNote: fields.requiresInPerson ? nullIfEmpty(fields.inPersonNote) : null,
        outOfScope: fields.outOfScope,
        llmAllowed: fields.outOfScope ? false : fields.llmAllowed,
        listRows
    }

    return questionId === null ? args : { questionId, ...args }
}
