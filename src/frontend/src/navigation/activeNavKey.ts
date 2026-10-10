import { matchPath } from "react-router-dom"
import NAV_GROUPS from "@/navigation/navGroups"
import ROUTES from "@/routers/paths"
import type NavKey from "@/types/navigation/NavKey.types"

function activeNavKey(pathname: string): NavKey | null {
    if (matchPath(ROUTES.appointmentDetail, pathname)) {
        return "appointments"
    }

    for (const group of NAV_GROUPS) {
        const item = group.items.find((candidate) => matchPath(candidate.path, pathname))

        if (item) {
            return item.key
        }
    }

    return null
}

export default activeNavKey
