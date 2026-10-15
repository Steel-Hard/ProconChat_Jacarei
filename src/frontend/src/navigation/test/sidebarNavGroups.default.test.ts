import { describe, expect, it } from "vitest"
import NAV_ITEMS_READY from "@/navigation/navItemsReady"
import sidebarNavGroups from "@/navigation/sidebarNavGroups"
import type PanelAccount from "@/types/account/PanelAccount.types"

const admin: PanelAccount = {
    id: 1,
    name: "Conta Teste",
    email: "conta@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

describe("sidebarNavGroups com as flags de produção", () => {
    it("não mostra nenhum item enquanto nenhuma tela estiver liberada", () => {
        expect(Object.values(NAV_ITEMS_READY).every((ready) => !ready)).toBe(true)
        expect(sidebarNavGroups(admin)).toEqual([])
    })
})
