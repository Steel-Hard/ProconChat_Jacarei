import { describe, expect, it } from "vitest"
import {
    activeNavKey,
    breadcrumbFor,
    canAccess,
    firstAllowedPath,
    visibleNavGroups,
    type NavKey
} from "@/routers/navigation"
import { PERMISSION_KEYS, type PanelAccount, type PermissionKey } from "@/types/account"

function account(permissions: PermissionKey[], isAdmin = false): PanelAccount {
    return { name: "Conta Teste", email: "conta@exemplo.gov.br", isAdmin, permissions }
}

function visibleKeys(value: PanelAccount | null): NavKey[] {
    return visibleNavGroups(value).flatMap((group) => group.items.map((item) => item.key))
}

describe("navigation", () => {
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

        expect(groups.map((group) => group.label)).toEqual(["Chatbot"])
        expect(canAccess(account(["content.manage"]), "dashboard")).toBe(false)
    })

    it("devolve a primeira tela permitida quando a conta não vê o Dashboard", () => {
        expect(firstAllowedPath(account(["content.manage"]))).toBe("/conteudo")
    })

    it("devolve o Dashboard quando a conta pode vê-lo", () => {
        expect(firstAllowedPath(account(["reports.view"]))).toBe("/")
    })

    it("devolve null quando a conta não tem nenhuma permissão", () => {
        expect(firstAllowedPath(account([]))).toBeNull()
    })

    it("monta a trilha do detalhe do agendamento com o link para a lista", () => {
        expect(breadcrumbFor("/agendamentos/42")).toEqual({
            group: "Operação",
            parent: { label: "Agendamentos", path: "/agendamentos" },
            title: "Detalhe do agendamento"
        })
    })

    it("monta a trilha de uma tela do menu com grupo e título", () => {
        expect(breadcrumbFor("/horarios")).toEqual({
            group: "Configurações",
            title: "Horários de atendimento"
        })
    })

    it("devolve trilha vazia para rota desconhecida", () => {
        expect(breadcrumbFor("/rota-desconhecida")).toBeNull()
    })

    it("marca Agendamentos como ativo no detalhe do agendamento", () => {
        expect(activeNavKey("/agendamentos/1")).toBe("appointments")
    })
})
