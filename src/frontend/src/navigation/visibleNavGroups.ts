import canAccess from "@/navigation/canAccess"
import NAV_GROUPS from "@/navigation/navGroups"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type NavGroup from "@/types/navigation/NavGroup.types"

function visibleNavGroups(account: PanelAccount | null): NavGroup[] {
    return NAV_GROUPS.map((group) => ({
        label: group.label,
        items: group.items.filter((item) => canAccess(account, item.key))
    })).filter((group) => group.items.length > 0)
}

export default visibleNavGroups
