import { describe, expect, it, vi } from "vitest"
import sidebarNavGroups from "@/navigation/sidebarNavGroups"
import type PanelAccount from "@/types/account/PanelAccount.types"

vi.mock("@/navigation/navItemsReady", () => ({
    default: {
        dashboard: false,
        appointments: false,
        reports: false,
        content: false,
        sessions: true,
        schedule: false,
        documents: false,
        users: false,
        whatsapp: true
    }
}))

const admin: PanelAccount = {
    id: 1,
    name: "Conta Teste",
    email: "conta@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

describe("sidebarNavGroups", () => {
    it("mostra só os itens liberados e some com os grupos que ficam vazios", () => {
        const groups = sidebarNavGroups(admin)

        expect(groups.map((group) => group.key)).toEqual(["chatbot", "settings"])
        expect(groups.flatMap((group) => group.items.map((item) => item.key))).toEqual([
            "sessions",
            "whatsapp"
        ])
    })

    it("continua respeitando a permissão da conta", () => {
        const limited: PanelAccount = { ...admin, isAdmin: false, permissions: ["sessions.view"] }

        expect(
            sidebarNavGroups(limited).flatMap((group) => group.items.map((item) => item.key))
        ).toEqual(["sessions"])
    })

    it("não mostra nada sem conta", () => {
        expect(sidebarNavGroups(null)).toEqual([])
    })
})
