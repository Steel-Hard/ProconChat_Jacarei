import type ContentCategoryInput from "@/types/content/ContentCategoryInput.types"
import type ContentQuestionInput from "@/types/content/ContentQuestionInput.types"

type ContentSavePlanStep =
    | { kind: "createCategory"; categoryKey: string; input: ContentCategoryInput }
    | {
          kind: "updateCategory"
          categoryId: number
          input: ContentCategoryInput & { active: boolean }
      }
    | { kind: "setCategoryActive"; categoryId: number; active: boolean }
    | {
          kind: "createQuestion"
          questionKey: string
          categoryKey: string
          input: ContentQuestionInput
      }
    | { kind: "updateQuestion"; questionId: number; input: ContentQuestionInput }
    | { kind: "setQuestionActive"; questionId: number; active: boolean }
    | { kind: "reorderCategories"; categoryKeys: string[] }
    | { kind: "reorderQuestions"; categoryKey: string; questionKeys: string[] }

export default ContentSavePlanStep
