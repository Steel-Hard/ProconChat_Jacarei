import { describe, expect, it } from "vitest"
import hasPermission from "@/navigation/hasPermission"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"

function account(permissions: PermissionKey[], isAdmin = false): PanelAccount {
    return { id: 1, name: "Conta Teste", email: "conta@exemplo.gov.br", isAdmin, permissions }
}

describe("hasPermission", () => {
    it("nega qualquer permissão sem conta", () => {
        expect(hasPermission(null, "appointments.view")).toBe(false)
    })

    it("libera qualquer permissão para o Admin, mesmo sem permissões marcadas", () => {
        expect(hasPermission(account([], true), "appointments.manage")).toBe(true)
        expect(hasPermission(account([], true), "users.manage")).toBe(true)
    })

    it("libera a permissão que a conta tem", () => {
        expect(hasPermission(account(["appointments.manage"]), "appointments.manage")).toBe(true)
    })

    it("nega a permissão que a conta não tem", () => {
        expect(hasPermission(account(["sessions.view"]), "appointments.view")).toBe(false)
    })

    it("trata Gerenciar agendamentos como Ver agendamentos", () => {
        expect(hasPermission(account(["appointments.manage"]), "appointments.view")).toBe(true)
    })

    it("não trata Ver agendamentos como Gerenciar agendamentos", () => {
        expect(hasPermission(account(["appointments.view"]), "appointments.manage")).toBe(false)
    })
})
