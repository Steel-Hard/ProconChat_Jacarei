import type PermissionKey from "@/types/account/PermissionKey.types"
import type NavKey from "@/types/navigation/NavKey.types"

const PERMISSION_SCREENS: Record<PermissionKey, NavKey> = {
    "appointments.view": "appointments",
    "appointments.manage": "appointments",
    "content.manage": "content",
    "schedule.configure": "schedule",
    "documents.configure": "documents",
    "sessions.view": "sessions",
    "reports.view": "reports",
    "users.manage": "users"
}

export default PERMISSION_SCREENS
