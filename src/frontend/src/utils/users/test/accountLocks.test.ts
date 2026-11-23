import { describe, expect, it } from "vitest"
import buildUserAccount from "@/testUtils/buildUserAccount"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"
import accountLocks from "@/utils/users/accountLocks"

function actorWith(permissions: PermissionKey[], isAdmin = false): PanelAccount {
    return { id: 2, name: "Carla Dias", email: "carla@exemplo.gov.br", isAdmin, permissions }
}

describe("accountLocks", () => {
    it("trava a própria conta comum: sem redefinir, com Alterar minha senha e desativar bloqueado", () => {
        const locks = accountLocks(
            actorWith(["users.manage"]),
            buildUserAccount({ id: 2, permissions: ["users.manage"] })
        )

        expect(locks).toEqual({
            selfLocked: true,
            outranks: false,
            canManage: false,
            showActions: true,
            showReset: false,
            showToggle: true,
            showSelfPassword: true
        })
    })

    it("mostra só Alterar minha senha na própria conta Admin", () => {
        const locks = accountLocks(actorWith([], true), buildUserAccount({ id: 2, isAdmin: true }))

        expect(locks).toMatchObject({
            showActions: true,
            showReset: false,
            showToggle: false,
            showSelfPassword: true
        })
    })

    it("bloqueia redefinir e desativar quando o alvo tem permissão que o ator não tem", () => {
        const locks = accountLocks(
            actorWith(["users.manage"]),
            buildUserAccount({ permissions: ["users.manage", "reports.view"] })
        )

        expect(locks).toEqual({
            selfLocked: false,
            outranks: true,
            canManage: false,
            showActions: true,
            showReset: true,
            showToggle: true,
            showSelfPassword: false
        })
    })

    it("libera redefinir e desativar quando o ator tem todas as permissões do alvo", () => {
        const locks = accountLocks(
            actorWith(["users.manage", "reports.view"]),
            buildUserAccount({ permissions: ["reports.view"] })
        )

        expect(locks).toMatchObject({ outranks: false, canManage: true, showReset: true })
    })

    it("não mostra nenhuma ação na conta Admin vista por outra conta", () => {
        const locks = accountLocks(actorWith(["users.manage"]), buildUserAccount({ isAdmin: true }))

        expect(locks).toMatchObject({
            outranks: false,
            showActions: false,
            showReset: false,
            showToggle: false,
            showSelfPassword: false
        })
    })

    it("nunca bloqueia uma conta comum quando o ator é Admin", () => {
        const locks = accountLocks(
            actorWith([], true),
            buildUserAccount({ permissions: ["reports.view", "users.manage"] })
        )

        expect(locks).toMatchObject({ outranks: false, canManage: true })
    })
})
