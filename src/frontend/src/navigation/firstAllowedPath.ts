import visibleNavGroups from "@/navigation/visibleNavGroups"
import type PanelAccount from "@/types/account/PanelAccount.types"

function firstAllowedPath(account: PanelAccount | null): string | null {
    const first = visibleNavGroups(account)[0]?.items[0]

    return first ? first.path : null
}

export default firstAllowedPath
