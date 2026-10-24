import { describe, expect, it } from "vitest"
import firstAllowedPath from "@/navigation/firstAllowedPath"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"

function account(permissions: PermissionKey[], isAdmin = false): PanelAccount {
    return { id: 1, name: "Conta Teste", email: "conta@exemplo.gov.br", isAdmin, permissions }
}

describe("firstAllowedPath", () => {
    it("devolve null quando a conta só tem telas não prontas", () => {
        expect(firstAllowedPath(account(["content.manage"]))).toBeNull()
    })

    it("devolve null para quem só vê relatórios enquanto o Dashboard não está pronto", () => {
        expect(firstAllowedPath(account(["reports.view"]))).toBeNull()
    })

    it("devolve null quando a conta não tem nenhuma permissão", () => {
        expect(firstAllowedPath(account([]))).toBeNull()
    })

    it("devolve null para quem só vê sessões", () => {
        expect(firstAllowedPath(account(["sessions.view"]))).toBeNull()
    })

    it("devolve Usuários para quem vê relatórios e gerencia usuários", () => {
        expect(firstAllowedPath(account(["reports.view", "users.manage"]))).toBe("/usuarios")
    })

    it("devolve Usuários para quem gerencia conteúdo e usuários", () => {
        expect(firstAllowedPath(account(["content.manage", "users.manage"]))).toBe("/usuarios")
    })

    it("devolve Agendamentos para o Admin sem permissões marcadas", () => {
        expect(firstAllowedPath(account([], true))).toBe("/agendamentos")
    })

    it("devolve Agendamentos para quem vê agendamentos", () => {
        expect(firstAllowedPath(account(["appointments.view"]))).toBe("/agendamentos")
    })
})
