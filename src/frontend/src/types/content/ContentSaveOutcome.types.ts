import type ContentSaveResult from "@/types/content/ContentSaveResult.types"
import type ContentSnapshot from "@/types/content/ContentSnapshot.types"

type ContentSaveOutcome = ContentSaveResult & {
    snapshot: ContentSnapshot | null
}

export default ContentSaveOutcome
