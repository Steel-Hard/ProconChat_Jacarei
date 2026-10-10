import { matchPath } from "react-router-dom"
import activeNavKey from "@/navigation/activeNavKey"
import NAV_GROUPS from "@/navigation/navGroups"
import ROUTES from "@/routers/paths"
import type Breadcrumb from "@/types/navigation/Breadcrumb.types"
import type NavGroup from "@/types/navigation/NavGroup.types"
import type NavItem from "@/types/navigation/NavItem.types"
import type NavKey from "@/types/navigation/NavKey.types"

function findItem(key: NavKey): { group: NavGroup; item: NavItem } {
    for (const group of NAV_GROUPS) {
        const item = group.items.find((candidate) => candidate.key === key)

        if (item) {
            return { group, item }
        }
    }

    throw new Error(`Item de navegação desconhecido: ${key}`)
}

function breadcrumbFor(pathname: string): Breadcrumb | null {
    if (matchPath(ROUTES.appointmentDetail, pathname)) {
        const { group, item } = findItem("appointments")

        return {
            group: group.label,
            parent: { label: item.title, path: item.path },
            title: "Detalhe do agendamento"
        }
    }

    const key = activeNavKey(pathname)

    if (key === null) {
        return null
    }

    const { group, item } = findItem(key)

    return { group: group.label, title: item.title }
}

export default breadcrumbFor
