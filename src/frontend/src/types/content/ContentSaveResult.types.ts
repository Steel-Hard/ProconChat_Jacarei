import type ContentSaveFailureKind from "@/types/content/ContentSaveFailureKind.types"
import type ContentSavePlanStep from "@/types/content/ContentSavePlanStep.types"

type ContentSaveFailure = {
    step: ContentSavePlanStep
    kind: ContentSaveFailureKind
    message: string | null
}

type ContentSaveResult = {
    idMap: Record<string, number>
    completed: number
    total: number
    failure: ContentSaveFailure | null
}

export default ContentSaveResult
