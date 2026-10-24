import { describe, expect, it, vi } from "vitest"
import firstAllowedPath from "@/navigation/firstAllowedPath"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"

vi.mock("@/navigation/navItemsReady", () => ({
    default: {
        dashboard: true,
        appointments: true,
        reports: false,
        content: false,
        sessions: false,
        schedule: false,
        documents: false,
        users: true,
        whatsapp: true
    }
}))

function account(permissions: PermissionKey[]): PanelAccount {
    return {
        id: 1,
        name: "Conta Teste",
        email: "conta@exemplo.gov.br",
        isAdmin: false,
        permissions
    }
}

describe("firstAllowedPath com o Dashboard pronto", () => {
    it("devolve o Dashboard para quem só vê relatórios", () => {
        expect(firstAllowedPath(account(["reports.view"]))).toBe("/")
    })

    it("devolve Usuários para quem não vê o Dashboard e gerencia usuários", () => {
        expect(firstAllowedPath(account(["content.manage", "users.manage"]))).toBe("/usuarios")
    })

    it("devolve null para quem só tem telas não prontas", () => {
        expect(firstAllowedPath(account(["content.manage"]))).toBeNull()
    })
})
