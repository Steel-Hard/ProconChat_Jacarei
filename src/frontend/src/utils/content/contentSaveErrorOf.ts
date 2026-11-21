import type ContentSaveFailureKind from "@/types/content/ContentSaveFailureKind.types"
import type ContentSavePlanStep from "@/types/content/ContentSavePlanStep.types"

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function messageOf(error: Record<string, unknown>): string | null {
    const data = error.data

    if (isRecord(data) && isRecord(data.error) && typeof data.error.message === "string") {
        return data.error.message
    }

    return null
}

export default function contentSaveErrorOf(
    error: unknown,
    step: ContentSavePlanStep
): { kind: ContentSaveFailureKind; message: string | null } {
    if (!isRecord(error) || !("status" in error)) {
        return { kind: "generic", message: null }
    }

    const message = messageOf(error)

    if (error.status === 401) {
        return { kind: "unauthorized", message }
    }

    if (error.status === 403) {
        return { kind: "forbidden", message }
    }

    if (
        error.status === 409 &&
        (step.kind === "createCategory" || step.kind === "updateCategory")
    ) {
        return { kind: "duplicateName", message }
    }

    if (
        error.status === 400 &&
        (step.kind === "reorderCategories" || step.kind === "reorderQuestions")
    ) {
        return { kind: "reorderRefused", message }
    }

    if (error.status === 400) {
        return { kind: "invalid", message }
    }

    return { kind: "generic", message }
}
