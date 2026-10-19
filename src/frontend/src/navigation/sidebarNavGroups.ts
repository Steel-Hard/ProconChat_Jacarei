import NAV_ITEMS_READY from "@/navigation/navItemsReady"
import visibleNavGroups from "@/navigation/visibleNavGroups"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type NavGroup from "@/types/navigation/NavGroup.types"

function sidebarNavGroups(account: PanelAccount | null): NavGroup[] {
    return visibleNavGroups(account)
        .map((group) => ({
            key: group.key,
            items: group.items.filter((item) => NAV_ITEMS_READY[item.key])
        }))
        .filter((group) => group.items.length > 0)
}

export default sidebarNavGroups
