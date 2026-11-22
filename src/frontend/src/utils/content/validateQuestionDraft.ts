import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"
import type ContentFieldError from "@/types/content/ContentFieldError.types"
import type ContentValidation from "@/types/content/ContentValidation.types"
import CONTENT_LIMITS from "@/utils/content/contentLimits"
import duplicateDocuments from "@/utils/content/duplicateDocuments"
import hasControlChars from "@/utils/content/hasControlChars"

function validateShortTitle(value: string, errors: ContentFieldError[]) {
    if (value === "") {
        errors.push({ field: "shortTitle", key: "errors.shortTitleRequired" })
    } else if (value.length > CONTENT_LIMITS.shortTitle) {
        errors.push({
            field: "shortTitle",
            key: "errors.shortTitleMax",
            params: { max: CONTENT_LIMITS.shortTitle }
        })
    } else if (hasControlChars(value)) {
        errors.push({ field: "shortTitle", key: "errors.noLineBreaks" })
    }
}

function validateShortDescription(value: string, errors: ContentFieldError[]) {
    if (value.length > CONTENT_LIMITS.shortDescription) {
        errors.push({
            field: "shortDescription",
            key: "errors.shortDescriptionMax",
            params: { max: CONTENT_LIMITS.shortDescription }
        })
    } else if (hasControlChars(value)) {
        errors.push({ field: "shortDescription", key: "errors.noLineBreaks" })
    }
}

function validateRequiredText(
    field: "question" | "answer",
    value: string,
    max: number,
    errors: ContentFieldError[]
) {
    if (value === "") {
        errors.push({ field, key: `errors.${field}Required` })
    } else if (value.length > max) {
        errors.push({ field, key: `errors.${field}Max`, params: { max } })
    }
}

function validateDocuments(documents: string[], errors: ContentFieldError[]) {
    if (documents.length > CONTENT_LIMITS.documentsCount) {
        errors.push({
            field: "requiredDocuments",
            key: "errors.documentsMax",
            params: { max: CONTENT_LIMITS.documentsCount }
        })
    }

    documents.forEach((document, index) => {
        const value = document.trim()
        const field = `requiredDocuments.${index}`

        if (value === "") {
            errors.push({ field, key: "errors.documentRequired" })
        } else if (value.length > CONTENT_LIMITS.document) {
            errors.push({
                field,
                key: "errors.documentMax",
                params: { max: CONTENT_LIMITS.document }
            })
        }
    })
}

export default function validateQuestionDraft(question: ContentDraftQuestion): ContentValidation {
    const errors: ContentFieldError[] = []

    validateShortTitle(question.shortTitle.trim(), errors)
    validateShortDescription(question.shortDescription.trim(), errors)
    validateRequiredText("question", question.question.trim(), CONTENT_LIMITS.question, errors)
    validateRequiredText("answer", question.answer.trim(), CONTENT_LIMITS.answer, errors)

    if (question.legalBasis.trim().length > CONTENT_LIMITS.legalBasis) {
        errors.push({
            field: "legalBasis",
            key: "errors.legalBasisMax",
            params: { max: CONTENT_LIMITS.legalBasis }
        })
    }

    validateDocuments(question.requiredDocuments, errors)

    if (
        question.requiresInPerson &&
        question.inPersonNote.trim().length > CONTENT_LIMITS.inPersonNote
    ) {
        errors.push({
            field: "inPersonNote",
            key: "errors.inPersonNoteMax",
            params: { max: CONTENT_LIMITS.inPersonNote }
        })
    }

    if (question.requiresInPerson && question.outOfScope) {
        errors.push({ field: "outOfScope", key: "errors.inPersonAndOutOfScope" })
    }

    if (question.outOfScope && question.llmAllowed) {
        errors.push({ field: "llmAllowed", key: "errors.outOfScopeWithLlm" })
    }

    const warnings: ContentFieldError[] = duplicateDocuments(question.requiredDocuments).map(
        (index) => ({ field: `requiredDocuments.${index}`, key: "documentsField.repeated" })
    )

    return { valid: errors.length === 0, errors, warnings }
}
