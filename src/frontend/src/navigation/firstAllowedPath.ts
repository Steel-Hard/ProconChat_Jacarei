import NAV_ITEMS_READY from "@/navigation/navItemsReady"
import visibleNavGroups from "@/navigation/visibleNavGroups"
import type PanelAccount from "@/types/account/PanelAccount.types"

function firstAllowedPath(account: PanelAccount | null): string | null {
    const ready = visibleNavGroups(account)
        .flatMap((group) => group.items)
        .find((item) => NAV_ITEMS_READY[item.key])

    return ready ? ready.path : null
}

export default firstAllowedPath
