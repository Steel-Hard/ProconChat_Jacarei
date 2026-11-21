import type ContentCategoryInput from "@/types/content/ContentCategoryInput.types"
import type ContentQuestionInput from "@/types/content/ContentQuestionInput.types"

type ContentSavePlanStep =
    | { kind: "createCategory"; categoryKey: string; input: ContentCategoryInput }
    | {
          kind: "updateCategory"
          categoryKey: string
          input: ContentCategoryInput & { active: boolean }
      }
    | { kind: "setCategoryActive"; categoryKey: string; active: boolean }
    | {
          kind: "createQuestion"
          questionKey: string
          categoryKey: string
          input: ContentQuestionInput
      }
    | { kind: "updateQuestion"; questionKey: string; input: ContentQuestionInput }
    | { kind: "setQuestionActive"; questionKey: string; active: boolean }
    | { kind: "reorderCategories"; categoryKeys: string[] }
    | { kind: "reorderQuestions"; categoryKey: string; questionKeys: string[] }

export default ContentSavePlanStep
