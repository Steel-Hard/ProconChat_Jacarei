import api from "@/store/api"
import type ContentActiveArgs from "@/types/content/ContentActiveArgs.types"
import type ContentCategory from "@/types/content/ContentCategory.types"
import type ContentCategoryInput from "@/types/content/ContentCategoryInput.types"
import type ContentCategoryUpdateArgs from "@/types/content/ContentCategoryUpdateArgs.types"
import type ContentEnvelope from "@/types/content/ContentEnvelope.types"
import type ContentPreviewArgs from "@/types/content/ContentPreviewArgs.types"
import type ContentPreviewResult from "@/types/content/ContentPreviewResult.types"
import type ContentQuestion from "@/types/content/ContentQuestion.types"
import type ContentQuestionCreateArgs from "@/types/content/ContentQuestionCreateArgs.types"
import type ContentQuestionUpdateArgs from "@/types/content/ContentQuestionUpdateArgs.types"
import type ContentReorderCategoriesArgs from "@/types/content/ContentReorderCategoriesArgs.types"
import type ContentReorderQuestionsArgs from "@/types/content/ContentReorderQuestionsArgs.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"

const CONTENT_PATH = "/api/v1/content"
const CATEGORIES_PATH = `${CONTENT_PATH}/categories`
const QUESTIONS_PATH = `${CONTENT_PATH}/questions`

function unwrap<T>(response: ContentEnvelope<T>): T {
    return response.data
}

const contentApi = api.injectEndpoints({
    endpoints: (build) => ({
        getContentSnapshot: build.query<ContentSnapshot, void>({
            async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
                const categoriesResult = await fetchWithBQ(CATEGORIES_PATH)

                if (categoriesResult.error) {
                    return { error: categoriesResult.error }
                }

                const categories = unwrap(
                    categoriesResult.data as ContentEnvelope<ContentCategory[]>
                )
                const questionResults = await Promise.all(
                    categories.map((category) =>
                        fetchWithBQ(`${CATEGORIES_PATH}/${category.id}/questions`)
                    )
                )
                const failed = questionResults.find((result) => result.error)

                if (failed?.error) {
                    return { error: failed.error }
                }

                const questionsByCategory: Record<number, ContentQuestion[]> = {}

                categories.forEach((category, index) => {
                    questionsByCategory[category.id] = unwrap(
                        questionResults[index].data as ContentEnvelope<ContentQuestion[]>
                    )
                })

                return { data: { categories, questionsByCategory } }
            },
            providesTags: ["ContentSnapshot"]
        }),
        createContentCategory: build.mutation<ContentCategory, ContentCategoryInput>({
            query: (body) => ({ url: CATEGORIES_PATH, method: "POST", body }),
            transformResponse: unwrap<ContentCategory>
        }),
        updateContentCategory: build.mutation<ContentCategory, ContentCategoryUpdateArgs>({
            query: ({ id, body }) => ({ url: `${CATEGORIES_PATH}/${id}`, method: "PUT", body }),
            transformResponse: unwrap<ContentCategory>
        }),
        setContentCategoryActive: build.mutation<ContentCategory, ContentActiveArgs>({
            query: ({ id, active }) => ({
                url: `${CATEGORIES_PATH}/${id}/active`,
                method: "PATCH",
                body: { active }
            }),
            transformResponse: unwrap<ContentCategory>
        }),
        reorderContentCategories: build.mutation<ContentCategory[], ContentReorderCategoriesArgs>({
            query: (body) => ({ url: `${CATEGORIES_PATH}/reorder`, method: "PUT", body }),
            transformResponse: unwrap<ContentCategory[]>
        }),
        createContentQuestion: build.mutation<ContentQuestion, ContentQuestionCreateArgs>({
            query: (body) => ({ url: QUESTIONS_PATH, method: "POST", body }),
            transformResponse: unwrap<ContentQuestion>
        }),
        updateContentQuestion: build.mutation<ContentQuestion, ContentQuestionUpdateArgs>({
            query: ({ id, body }) => ({ url: `${QUESTIONS_PATH}/${id}`, method: "PUT", body }),
            transformResponse: unwrap<ContentQuestion>
        }),
        setContentQuestionActive: build.mutation<ContentQuestion, ContentActiveArgs>({
            query: ({ id, active }) => ({
                url: `${QUESTIONS_PATH}/${id}/active`,
                method: "PATCH",
                body: { active }
            }),
            transformResponse: unwrap<ContentQuestion>
        }),
        reorderContentQuestions: build.mutation<ContentQuestion[], ContentReorderQuestionsArgs>({
            query: ({ categoryId, questionIds }) => ({
                url: `${CATEGORIES_PATH}/${categoryId}/questions/reorder`,
                method: "PUT",
                body: { questionIds }
            }),
            transformResponse: unwrap<ContentQuestion[]>
        }),
        previewContentQuestion: build.query<ContentPreviewResult, ContentPreviewArgs>({
            query: (body) => ({ url: `${QUESTIONS_PATH}/preview`, method: "POST", body }),
            transformResponse: unwrap<ContentPreviewResult>,
            keepUnusedDataFor: 0
        })
    })
})

export default contentApi
