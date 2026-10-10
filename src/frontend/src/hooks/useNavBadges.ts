import type { NavKey } from "@/routers/navigation"

export type NavBadge = {
    count: number
    label: string
}

export type NavBadges = Partial<Record<NavKey, NavBadge>>

const NO_BADGES: NavBadges = {}

export function useNavBadges(): NavBadges {
    return NO_BADGES
}
