import type ContentChange from "@/types/content/ContentChange.types"

type Translate = (key: string, params?: Record<string, unknown>) => string

export default function labelContentChange(change: ContentChange, translate: unknown): string {
    const t = translate as Translate
    const params = { name: change.name }

    if (change.kind === "categoryState") {
        return t(`changes.${change.active ? "categoryActivated" : "categoryDeactivated"}`, params)
    }

    if (change.kind === "questionState") {
        return t(`changes.${change.active ? "questionActivated" : "questionDeactivated"}`, params)
    }

    return t(`changes.${change.kind}`, params)
}
