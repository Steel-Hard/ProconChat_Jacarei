import { describe, expect, it } from "vitest"
import canAccess from "@/navigation/canAccess"
import firstAllowedPath from "@/navigation/firstAllowedPath"
import PERMISSION_KEYS from "@/navigation/permissionKeys"
import PERMISSION_SCREENS from "@/navigation/permissionScreens"
import readyPermissionKeys from "@/navigation/readyPermissionKeys"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"

function account(permissions: PermissionKey[]): PanelAccount {
    return {
        id: 1,
        name: "Conta Teste",
        email: "conta@exemplo.gov.br",
        isAdmin: false,
        permissions
    }
}

describe("PERMISSION_SCREENS", () => {
    it.each(PERMISSION_KEYS)("a permissão %s sozinha dá acesso à própria tela", (key) => {
        expect(canAccess(account([key]), PERMISSION_SCREENS[key])).toBe(true)
    })

    it("liga Ver agendamentos e Gerenciar agendamentos à mesma tela", () => {
        expect(PERMISSION_SCREENS["appointments.view"]).toBe(
            PERMISSION_SCREENS["appointments.manage"]
        )
    })

    it("nunca usa o Dashboard nem o WhatsApp como tela de uma permissão", () => {
        const screens = Object.values(PERMISSION_SCREENS)

        expect(screens).not.toContain("dashboard")
        expect(screens).not.toContain("whatsapp")
    })

    it("dá uma tela pronta a quem recebe só uma permissão visível", () => {
        const withoutScreen = readyPermissionKeys().filter(
            (key) => firstAllowedPath(account([key])) === null
        )

        expect(withoutScreen).toEqual([])
    })
})
