import type NavKey from "@/types/navigation/NavKey.types"

const NAV_ITEMS_READY: Record<NavKey, boolean> = {
    dashboard: false,
    appointments: true,
    reports: false,
    content: false,
    sessions: false,
    schedule: true,
    documents: false,
    users: true,
    whatsapp: true
}

export default NAV_ITEMS_READY
