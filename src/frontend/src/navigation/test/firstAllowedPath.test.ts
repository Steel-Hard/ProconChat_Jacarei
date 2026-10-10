import { describe, expect, it } from "vitest"
import firstAllowedPath from "@/navigation/firstAllowedPath"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"

function account(permissions: PermissionKey[], isAdmin = false): PanelAccount {
    return { name: "Conta Teste", email: "conta@exemplo.gov.br", isAdmin, permissions }
}

describe("firstAllowedPath", () => {
    it("devolve a primeira tela permitida quando a conta não vê o Dashboard", () => {
        expect(firstAllowedPath(account(["content.manage"]))).toBe("/conteudo")
    })

    it("devolve o Dashboard quando a conta pode vê-lo", () => {
        expect(firstAllowedPath(account(["reports.view"]))).toBe("/")
    })

    it("devolve null quando a conta não tem nenhuma permissão", () => {
        expect(firstAllowedPath(account([]))).toBeNull()
    })
})
