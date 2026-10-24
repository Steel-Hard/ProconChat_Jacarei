import { describe, expect, it } from "vitest"
import buildUserAccount from "@/testUtils/buildUserAccount"
import type DraftChangeTexts from "@/types/users/DraftChangeTexts.types"
import draftChangeList from "@/utils/users/draftChangeList"

const texts: DraftChangeTexts = {
    permissionName: (key) => `<${key}>`,
    grant: (name, permission) => `${name}: conceder ${permission}`,
    revoke: (name, permission) => `${name}: remover ${permission}`,
    deactivate: (name) => `${name}: desativar conta`,
    reactivate: (name) => `${name}: reativar conta`,
    redistributed: (change, count) => `${change} (${count} agendamento(s) redistribuído(s))`
}

describe("draftChangeList", () => {
    it("lista as mudanças na ordem das contas, com ativo/inativo antes das permissões", () => {
        const bruno = buildUserAccount({ id: 7, name: "Bruno", permissions: ["reports.view"] })
        const carla = buildUserAccount({ id: 3, name: "Carla", active: false })

        const result = draftChangeList(
            [bruno, carla],
            {
                3: { active: true },
                7: { active: false, permissions: ["content.manage"] }
            },
            texts
        )

        expect(result).toEqual([
            "Bruno: desativar conta",
            "Bruno: conceder <content.manage>",
            "Bruno: remover <reports.view>",
            "Carla: reativar conta"
        ])
    })

    it("junta os agendamentos redistribuídos à linha da desativação de cada conta", () => {
        const bruno = buildUserAccount({ id: 7, name: "Bruno" })
        const carla = buildUserAccount({ id: 3, name: "Carla" })

        const result = draftChangeList(
            [bruno, carla],
            {
                7: {
                    active: false,
                    reassignment: { mode: "pending", count: 2, reason: "deactivate" }
                },
                3: {
                    active: false,
                    reassignment: { mode: "assign", toUserId: 1, count: 1, reason: "deactivate" }
                }
            },
            texts
        )

        expect(result).toEqual([
            "Bruno: desativar conta (2 agendamento(s) redistribuído(s))",
            "Carla: desativar conta (1 agendamento(s) redistribuído(s))"
        ])
    })

    it("junta os agendamentos redistribuídos à linha que tira Gerenciar agendamentos", () => {
        const bruno = buildUserAccount({
            id: 7,
            name: "Bruno",
            permissions: ["appointments.view", "appointments.manage"]
        })

        const result = draftChangeList(
            [bruno],
            {
                7: {
                    active: false,
                    permissions: ["appointments.view", "content.manage"],
                    reassignment: { mode: "pending", count: 2, reason: "manageRemoved" }
                }
            },
            texts
        )

        expect(result).toEqual([
            "Bruno: desativar conta",
            "Bruno: remover <appointments.manage> (2 agendamento(s) redistribuído(s))",
            "Bruno: conceder <content.manage>"
        ])
    })

    it("não lista nada sem rascunho", () => {
        expect(draftChangeList([buildUserAccount()], {}, texts)).toEqual([])
    })
})
