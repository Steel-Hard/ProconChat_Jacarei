import ROUTES from "@/routers/paths"
import type NavGroup from "@/types/navigation/NavGroup.types"

const NAV_GROUPS: NavGroup[] = [
    {
        label: "Operação",
        items: [
            { key: "dashboard", path: ROUTES.dashboard, label: "Dashboard", title: "Dashboard" },
            {
                key: "appointments",
                path: ROUTES.appointments,
                label: "Agendamentos",
                title: "Agendamentos"
            },
            { key: "reports", path: ROUTES.reports, label: "Relatórios", title: "Relatórios" }
        ]
    },
    {
        label: "Chatbot",
        items: [
            {
                key: "content",
                path: ROUTES.content,
                label: "Conteúdo",
                title: "Conteúdo do chatbot"
            },
            { key: "sessions", path: ROUTES.sessions, label: "Sessões", title: "Sessões" }
        ]
    },
    {
        label: "Configurações",
        items: [
            {
                key: "schedule",
                path: ROUTES.schedule,
                label: "Horários de atendimento",
                title: "Horários de atendimento"
            },
            {
                key: "documents",
                path: ROUTES.documents,
                label: "Documentos",
                title: "Documentos para atendimento"
            },
            { key: "users", path: ROUTES.users, label: "Usuários", title: "Usuários" },
            { key: "whatsapp", path: ROUTES.whatsapp, label: "WhatsApp", title: "WhatsApp" }
        ]
    }
]

export default NAV_GROUPS
