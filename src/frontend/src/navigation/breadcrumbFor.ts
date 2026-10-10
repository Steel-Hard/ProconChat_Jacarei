import { matchPath } from "react-router-dom"
import activeNavKey from "@/navigation/activeNavKey"
import NAV_GROUPS from "@/navigation/navGroups"
import ROUTES from "@/routers/paths"
import type Breadcrumb from "@/types/navigation/Breadcrumb.types"
import type NavGroup from "@/types/navigation/NavGroup.types"
import type NavKey from "@/types/navigation/NavKey.types"

function groupOf(key: NavKey): NavGroup {
    const group = NAV_GROUPS.find((candidate) => candidate.items.some((item) => item.key === key))

    if (!group) {
        throw new Error(`Item de navegação desconhecido: ${key}`)
    }

    return group
}

function breadcrumbFor(pathname: string): Breadcrumb | null {
    if (matchPath(ROUTES.appointmentDetail, pathname)) {
        return {
            group: groupOf("appointments").key,
            parent: { key: "appointments", path: ROUTES.appointments },
            page: "appointmentDetail"
        }
    }

    const key = activeNavKey(pathname)

    if (key === null) {
        return null
    }

    return { group: groupOf(key).key, page: key }
}

export default breadcrumbFor
