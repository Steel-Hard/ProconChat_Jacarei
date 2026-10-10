import { describe, expect, it } from "vitest"
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

describe("visibleNavGroups", () => {
    it("mostra os 9 itens nos 3 grupos para o Admin", () => {
        const groups = visibleNavGroups(account([], true))

        expect(groups.map((group) => group.label)).toEqual(["Operação", "Chatbot", "Configurações"])
        expect(groups.flatMap((group) => group.items.map((item) => item.label))).toEqual([
            "Dashboard",
            "Agendamentos",
            "Relatórios",
            "Conteúdo",
            "Sessões",
            "Horários de atendimento",
            "Documentos",
            "Usuários",
            "WhatsApp"
        ])
    })

    it("não mostra nenhum item sem conta", () => {
        expect(visibleNavGroups(null)).toEqual([])
    })

    it.each<[PermissionKey, NavKey[]]>([
        ["appointments.view", ["dashboard", "appointments"]],
        ["appointments.manage", ["dashboard", "appointments"]],
        ["reports.view", ["dashboard", "reports"]],
        ["content.manage", ["content"]],
        ["sessions.view", ["dashboard", "sessions"]],
        ["schedule.configure", ["schedule"]],
        ["documents.configure", ["documents"]],
        ["users.manage", ["users"]]
    ])("a permissão %s sozinha libera só os itens dela", (permission, expected) => {
        expect(visibleKeys(account([permission]))).toEqual(expected)
    })
})
