import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type LastChange from "@/types/settings/LastChange.types"

export default function latestContentChange(draft: ContentDraftState): LastChange | null {
    const items = [...draft.categories, ...Object.values(draft.questionsByCategory).flat()]
    let latest: LastChange | null = null

    items.forEach((item) => {
        if (item.updatedBy === null || item.updatedAt === null) {
            return
        }

        if (latest === null || Date.parse(item.updatedAt) > Date.parse(latest.changedAt)) {
            latest = { changedBy: item.updatedBy.name, changedAt: item.updatedAt }
        }
    })

    return latest
}
