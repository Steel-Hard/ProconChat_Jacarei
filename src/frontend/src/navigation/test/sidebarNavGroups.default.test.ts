import { describe, expect, it } from "vitest"
import NAV_ITEMS_READY from "@/navigation/navItemsReady"
import PERMISSION_KEYS from "@/navigation/permissionKeys"
import sidebarNavGroups from "@/navigation/sidebarNavGroups"
import ROUTES from "@/routers/paths"
import type PanelAccount from "@/types/account/PanelAccount.types"

const admin: PanelAccount = {
    id: 1,
    name: "Conta Teste",
    email: "conta@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

const staffWithAllPermissions: PanelAccount = {
    id: 2,
    name: "Funcionário Teste",
    email: "funcionario@exemplo.gov.br",
    isAdmin: false,
    permissions: [...PERMISSION_KEYS]
}

describe("sidebarNavGroups com as flags de produção", () => {
    it("Agendamentos, Relatórios, Horários de atendimento, Documentos, Usuários e WhatsApp estão liberados", () => {
        expect(
            Object.entries(NAV_ITEMS_READY)
                .filter(([, ready]) => ready)
                .map(([key]) => key)
        ).toEqual(["appointments", "reports", "schedule", "documents", "users", "whatsapp"])
    })

    it("o Admin vê Agendamentos e Relatórios em Operação e as outras telas prontas em Configurações", () => {
        expect(sidebarNavGroups(admin)).toEqual([
            {
                key: "operation",
                items: [
                    { key: "appointments", path: ROUTES.appointments },
                    { key: "reports", path: ROUTES.reports }
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
        ])
    })

    it("um funcionário com todas as permissões vê Agendamentos e Relatórios em Operação", () => {
        expect(sidebarNavGroups(staffWithAllPermissions)).toEqual([
            {
                key: "operation",
                items: [
                    { key: "appointments", path: ROUTES.appointments },
                    { key: "reports", path: ROUTES.reports }
                ]
            },
            {
                key: "settings",
                items: [
                    { key: "schedule", path: ROUTES.schedule },
                    { key: "documents", path: ROUTES.documents },
                    { key: "users", path: ROUTES.users }
                ]
            }
        ])
    })

    it("um funcionário sem Gerenciar usuários nem Configurar atendimento nem Documentos não vê o grupo Configurações", () => {
        const staffWithoutUsers: PanelAccount = {
            ...staffWithAllPermissions,
            permissions: PERMISSION_KEYS.filter(
                (key) =>
                    key !== "users.manage" &&
                    key !== "schedule.configure" &&
                    key !== "documents.configure"
            )
        }

        expect(sidebarNavGroups(staffWithoutUsers)).toEqual([
            {
                key: "operation",
                items: [
                    { key: "appointments", path: ROUTES.appointments },
                    { key: "reports", path: ROUTES.reports }
                ]
            }
        ])
    })

    it("um funcionário só com Configurar atendimento presencial vê só Horários de atendimento", () => {
        const scheduleOnly: PanelAccount = {
            ...staffWithAllPermissions,
            permissions: ["schedule.configure"]
        }

        expect(sidebarNavGroups(scheduleOnly)).toEqual([
            { key: "settings", items: [{ key: "schedule", path: ROUTES.schedule }] }
        ])
    })

    it("um funcionário só com Configurar documentos vê só Documentos", () => {
        const documentsOnly: PanelAccount = {
            ...staffWithAllPermissions,
            permissions: ["documents.configure"]
        }

        expect(sidebarNavGroups(documentsOnly)).toEqual([
            { key: "settings", items: [{ key: "documents", path: ROUTES.documents }] }
        ])
    })
})
