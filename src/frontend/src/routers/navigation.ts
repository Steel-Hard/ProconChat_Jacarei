import { matchPath } from "react-router-dom"
import { ROUTES } from "@/routers/paths"
import type { PanelAccount, PermissionKey } from "@/types/account"

export type NavKey =
    | "dashboard"
    | "appointments"
    | "reports"
    | "content"
    | "sessions"
    | "schedule"
    | "documents"
    | "users"
    | "whatsapp"

export type NavItem = {
    key: NavKey
    path: string
    label: string
    title: string
}

export type NavGroup = {
    label: string
    items: NavItem[]
}

export type Breadcrumb = {
    group: string
    parent?: { label: string; path: string }
    title: string
}

type AccessRule = { adminOnly: true } | { anyOf: PermissionKey[] }

export const NAV_GROUPS: NavGroup[] = [
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

const ACCESS_RULES: Record<NavKey, AccessRule> = {
    dashboard: {
        anyOf: ["appointments.view", "appointments.manage", "sessions.view", "reports.view"]
    },
    appointments: { anyOf: ["appointments.view", "appointments.manage"] },
    reports: { anyOf: ["reports.view"] },
    content: { anyOf: ["content.manage"] },
    sessions: { anyOf: ["sessions.view"] },
    schedule: { anyOf: ["schedule.configure"] },
    documents: { anyOf: ["documents.configure"] },
    users: { anyOf: ["users.manage"] },
    whatsapp: { adminOnly: true }
}

export function canAccess(account: PanelAccount | null, key: NavKey): boolean {
    if (account === null) {
        return false
    }

    if (account.isAdmin) {
        return true
    }

    const rule = ACCESS_RULES[key]

    if ("adminOnly" in rule) {
        return false
    }

    return rule.anyOf.some((permission) => account.permissions.includes(permission))
}

export function visibleNavGroups(account: PanelAccount | null): NavGroup[] {
    return NAV_GROUPS.map((group) => ({
        label: group.label,
        items: group.items.filter((item) => canAccess(account, item.key))
    })).filter((group) => group.items.length > 0)
}

export function firstAllowedPath(account: PanelAccount | null): string | null {
    const first = visibleNavGroups(account)[0]?.items[0]

    return first ? first.path : null
}

function findItem(key: NavKey): { group: NavGroup; item: NavItem } {
    for (const group of NAV_GROUPS) {
        const item = group.items.find((candidate) => candidate.key === key)

        if (item) {
            return { group, item }
        }
    }

    throw new Error(`Item de navegação desconhecido: ${key}`)
}

export function activeNavKey(pathname: string): NavKey | null {
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

export function breadcrumbFor(pathname: string): Breadcrumb | null {
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
