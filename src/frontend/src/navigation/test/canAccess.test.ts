import { describe, expect, it } from "vitest"
import canAccess from "@/navigation/canAccess"
import PERMISSION_KEYS from "@/navigation/permissionKeys"
import visibleNavGroups from "@/navigation/visibleNavGroups"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"
import type NavKey from "@/types/navigation/NavKey.types"

function account(permissions: PermissionKey[], isAdmin = false): PanelAccount {
    return { name: "Conta Teste", email: "conta@exemplo.gov.br", isAdmin, permissions }
}

function visibleKeys(value: PanelAccount | null): NavKey[] {
    return visibleNavGroups(value).flatMap((group) => group.items.map((item) => item.key))
}

describe("canAccess", () => {
    it("trata Gerenciar agendamentos como Ver agendamentos", () => {
        const value = account(["appointments.manage"])

        expect(canAccess(value, "appointments")).toBe(true)
        expect(canAccess(value, "dashboard")).toBe(true)
    })

    it("não mostra WhatsApp para quem não é Admin, mesmo com as 8 permissões", () => {
        const value = account([...PERMISSION_KEYS])

        expect(canAccess(value, "whatsapp")).toBe(false)
        expect(visibleKeys(value)).not.toContain("whatsapp")
    })

    it("omite o grupo Operação quando a conta só tem Conteúdo", () => {
        const groups = visibleNavGroups(account(["content.manage"]))

        expect(groups.map((group) => group.key)).toEqual(["chatbot"])
        expect(canAccess(account(["content.manage"]), "dashboard")).toBe(false)
    })
})
