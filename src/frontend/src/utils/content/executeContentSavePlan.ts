import type ContentSaveApi from "@/types/content/ContentSaveApi.types"
import type ContentSavePlanStep from "@/types/content/ContentSavePlanStep.types"
import type ContentSaveResult from "@/types/content/ContentSaveResult.types"
import contentSaveErrorOf from "@/utils/content/contentSaveErrorOf"

export default async function executeContentSavePlan(
    plan: ContentSavePlanStep[],
    api: ContentSaveApi
): Promise<ContentSaveResult> {
    const idMap: Record<string, number> = {}
    const idOf = (key: string) => (key in idMap ? idMap[key] : Number(key))

    async function run(step: ContentSavePlanStep): Promise<void> {
        switch (step.kind) {
            case "createCategory": {
                const created = await api.createCategory(step.input)
                idMap[step.categoryKey] = created.id
                return
            }
            case "updateCategory":
                await api.updateCategory(idOf(step.categoryKey), step.input)
                return
            case "setCategoryActive":
                await api.setCategoryActive(idOf(step.categoryKey), step.active)
                return
            case "createQuestion": {
                const created = await api.createQuestion(idOf(step.categoryKey), step.input)
                idMap[step.questionKey] = created.id
                return
            }
            case "updateQuestion":
                await api.updateQuestion(idOf(step.questionKey), step.input)
                return
            case "setQuestionActive":
                await api.setQuestionActive(idOf(step.questionKey), step.active)
                return
            case "reorderCategories":
                await api.reorderCategories(step.categoryKeys.map(idOf))
                return
            case "reorderQuestions":
                await api.reorderQuestions(idOf(step.categoryKey), step.questionKeys.map(idOf))
        }
    }

    for (let index = 0; index < plan.length; index += 1) {
        try {
            await run(plan[index])
        } catch (caught) {
            return {
                idMap,
                completed: index,
                total: plan.length,
                failure: { step: plan[index], ...contentSaveErrorOf(caught, plan[index]) }
            }
        }
    }

    return { idMap, completed: plan.length, total: plan.length, failure: null }
}
