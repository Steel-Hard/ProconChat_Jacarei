import { useRef, useState } from "react"
import contentApi from "@/store/api/content.api"
import useAppDispatch from "@/store/useAppDispatch"
import type ContentSaveApi from "@/types/content/ContentSaveApi.types"
import type ContentSaveOutcome from "@/types/content/ContentSaveOutcome.types"
import type ContentSavePlanStep from "@/types/content/ContentSavePlanStep.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"
import executeContentSavePlan from "@/utils/content/executeContentSavePlan"

function useContentSave() {
    const dispatch = useAppDispatch()
    const [createCategory] = contentApi.useCreateContentCategoryMutation()
    const [updateCategory] = contentApi.useUpdateContentCategoryMutation()
    const [setCategoryActive] = contentApi.useSetContentCategoryActiveMutation()
    const [reorderCategories] = contentApi.useReorderContentCategoriesMutation()
    const [createQuestion] = contentApi.useCreateContentQuestionMutation()
    const [updateQuestion] = contentApi.useUpdateContentQuestionMutation()
    const [setQuestionActive] = contentApi.useSetContentQuestionActiveMutation()
    const [reorderQuestions] = contentApi.useReorderContentQuestionsMutation()
    const [saving, setSaving] = useState(false)
    const inFlight = useRef(false)

    const api: ContentSaveApi = {
        createCategory: (input) => createCategory(input).unwrap(),
        updateCategory: (id, body) => updateCategory({ id, body }).unwrap(),
        setCategoryActive: (id, active) => setCategoryActive({ id, active }).unwrap(),
        createQuestion: (categoryId, input) => createQuestion({ ...input, categoryId }).unwrap(),
        updateQuestion: (id, body) => updateQuestion({ id, body }).unwrap(),
        setQuestionActive: (id, active) => setQuestionActive({ id, active }).unwrap(),
        reorderCategories: (categoryIds) => reorderCategories({ categoryIds }).unwrap(),
        reorderQuestions: (categoryId, questionIds) =>
            reorderQuestions({ categoryId, questionIds }).unwrap()
    }

    async function reload(): Promise<ContentSnapshot | null> {
        try {
            return await dispatch(
                contentApi.endpoints.getContentSnapshot.initiate(undefined, {
                    forceRefetch: true,
                    subscribe: false
                })
            ).unwrap()
        } catch {
            return null
        }
    }

    async function save(plan: ContentSavePlanStep[]): Promise<ContentSaveOutcome | null> {
        if (inFlight.current) {
            return null
        }

        inFlight.current = true
        setSaving(true)

        try {
            const result = await executeContentSavePlan(plan, api)
            const snapshot = result.completed > 0 || result.failure !== null ? await reload() : null

            return { ...result, snapshot }
        } finally {
            inFlight.current = false
            setSaving(false)
        }
    }

    return { saving, save, reload }
}

export default useContentSave
