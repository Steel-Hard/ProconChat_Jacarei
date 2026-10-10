import type NavGroupKey from "@/types/navigation/NavGroupKey.types"
import type NavItem from "@/types/navigation/NavItem.types"

type NavGroup = {
    key: NavGroupKey
    items: NavItem[]
}

export default NavGroup
