import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"

export default function normalizeQuestionFields(
    fields: ContentQuestionFormFields,
    wasOutOfScope: boolean
): ContentQuestionFormFields {
    const outOfScope = fields.outOfScope
    const requiresInPerson = outOfScope ? false : fields.requiresInPerson
    let llmAllowed = fields.llmAllowed

    if (outOfScope) {
        llmAllowed = false
    } else if (wasOutOfScope) {
        llmAllowed = true
    }

    return {
        ...fields,
        requiresInPerson,
        inPersonNote: requiresInPerson ? fields.inPersonNote : "",
        llmAllowed
    }
}
