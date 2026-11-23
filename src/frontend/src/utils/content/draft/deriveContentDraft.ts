import type ContentCategory from "@/types/content/ContentCategory.types"
import type ContentDraftCategory from "@/types/content/ContentDraftCategory.types"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentQuestion from "@/types/content/ContentQuestion.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"

export function draftCategoryOf(category: ContentCategory): ContentDraftCategory {
    return {
        key: String(category.id),
        id: category.id,
        title: category.title,
        shortTitle: category.shortTitle,
        description: category.description ?? "",
        active: category.active,
        updatedBy: category.updatedBy,
        updatedAt: category.updatedAt
    }
}

export function draftQuestionOf(question: ContentQuestion): ContentDraftQuestion {
    return {
        key: String(question.id),
        id: question.id,
        categoryKey: String(question.categoryId),
        shortTitle: question.shortTitle,
        shortDescription: question.shortDescription ?? "",
        question: question.question,
        answer: question.answer,
        legalBasis: question.legalBasis ?? "",
        requiredDocuments: [...question.requiredDocuments],
        requiresInPerson: question.requiresInPerson,
        inPersonNote: question.inPersonNote ?? "",
        outOfScope: question.outOfScope,
        llmAllowed: question.llmAllowed,
        active: question.active,
        updatedBy: question.updatedBy,
        updatedAt: question.updatedAt
    }
}

export default function deriveContentDraft(snapshot: ContentSnapshot): ContentDraftState {
    const questionsByCategory: Record<string, ContentDraftQuestion[]> = {}

    snapshot.categories.forEach((category) => {
        questionsByCategory[String(category.id)] = (
            snapshot.questionsByCategory[category.id] ?? []
        ).map(draftQuestionOf)
    })

    return {
        categories: snapshot.categories.map(draftCategoryOf),
        questionsByCategory,
        nextNewKey: 1
    }
}
