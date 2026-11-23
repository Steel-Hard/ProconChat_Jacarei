import type NavKey from "@/types/navigation/NavKey.types"

const NAV_ITEMS_READY: Record<NavKey, boolean> = {
    dashboard: false,
    appointments: true,
    reports: true,
    content: true,
    sessions: false,
    schedule: true,
    documents: true,
    users: true,
    whatsapp: true
}

export default NAV_ITEMS_READY
