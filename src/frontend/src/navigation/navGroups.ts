import ROUTES from "@/routers/paths"
import type NavGroup from "@/types/navigation/NavGroup.types"

const NAV_GROUPS: NavGroup[] = [
    {
        key: "operation",
        items: [
            { key: "dashboard", path: ROUTES.dashboard },
            { key: "appointments", path: ROUTES.appointments },
            { key: "reports", path: ROUTES.reports }
        ]
    },
    {
        key: "chatbot",
        items: [
            { key: "content", path: ROUTES.content },
            { key: "sessions", path: ROUTES.sessions }
        ]
    },
    {
        key: "settings",
        items: [
            { key: "schedule", path: ROUTES.schedule },
            { key: "documents", path: ROUTES.documents },
            { key: "users", path: ROUTES.users },
            { key: "whatsapp", path: ROUTES.whatsapp }
        ]
    }
]

export default NAV_GROUPS
