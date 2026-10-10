import type NavKey from "@/types/navigation/NavKey.types"

type NavItem = {
    key: NavKey
    path: string
    label: string
    title: string
}

export default NavItem
