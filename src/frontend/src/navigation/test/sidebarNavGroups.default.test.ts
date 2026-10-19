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
    it("Agendamentos e WhatsApp estão liberados", () => {
        expect(
            Object.entries(NAV_ITEMS_READY)
                .filter(([, ready]) => ready)
                .map(([key]) => key)
        ).toEqual(["appointments", "whatsapp"])
    })

    it("o Admin vê Agendamentos em Operação e WhatsApp em Configurações", () => {
        expect(sidebarNavGroups(admin)).toEqual([
            { key: "operation", items: [{ key: "appointments", path: ROUTES.appointments }] },
            { key: "settings", items: [{ key: "whatsapp", path: ROUTES.whatsapp }] }
        ])
    })

    it("um funcionário com todas as permissões vê só Agendamentos em Operação", () => {
        expect(sidebarNavGroups(staffWithAllPermissions)).toEqual([
            { key: "operation", items: [{ key: "appointments", path: ROUTES.appointments }] }
        ])
    })
})
