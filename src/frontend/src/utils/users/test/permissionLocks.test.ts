import { describe, expect, it } from "vitest"
import PERMISSION_KEYS from "@/navigation/permissionKeys"
import buildUserAccount from "@/testUtils/buildUserAccount"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"
import permissionLocks from "@/utils/users/permissionLocks"

function actorWith(permissions: PermissionKey[], isAdmin = false): PanelAccount {
    return { id: 2, name: "Carla Dias", email: "carla@exemplo.gov.br", isAdmin, permissions }
}

function lockOf(locks: ReturnType<typeof permissionLocks>, key: PermissionKey) {
    return locks.find((lock) => lock.key === key)
}

describe("permissionLocks", () => {
    it("devolve as 8 permissões na ordem das chaves", () => {
        const locks = permissionLocks(actorWith([], true), buildUserAccount())

        expect(locks.map((lock) => lock.key)).toEqual([...PERMISSION_KEYS])
    })

    it("mostra a conta Admin com tudo marcado e desabilitado, sem aviso por permissão", () => {
        const locks = permissionLocks(actorWith([], true), buildUserAccount({ isAdmin: true }))

        expect(
            locks.every((lock) => lock.checked && lock.disabled && lock.reason === "admin")
        ).toBe(true)
    })

    it("desabilita todas as permissões da própria conta", () => {
        const actor = actorWith(["users.manage", "reports.view"])
        const locks = permissionLocks(
            actor,
            buildUserAccount({ id: 2, permissions: ["users.manage"] })
        )

        expect(locks.every((lock) => lock.disabled && lock.reason === "self")).toBe(true)
        expect(lockOf(locks, "users.manage")?.checked).toBe(true)
        expect(lockOf(locks, "reports.view")?.checked).toBe(false)
    })

    it("desabilita a permissão que o ator não tem, com o aviso de falta", () => {
        const locks = permissionLocks(actorWith(["users.manage"]), buildUserAccount())

        expect(lockOf(locks, "reports.view")).toEqual({
            key: "reports.view",
            checked: false,
            disabled: true,
            reason: "lacks"
        })
        expect(lockOf(locks, "users.manage")).toEqual({
            key: "users.manage",
            checked: false,
            disabled: false,
            reason: "none"
        })
    })

    it("bloqueia desmarcar Ver agendamentos de quem tem as duas quando o ator não gerencia agendamentos", () => {
        const locks = permissionLocks(
            actorWith(["users.manage", "appointments.view"]),
            buildUserAccount({ permissions: ["appointments.view", "appointments.manage"] })
        )

        expect(lockOf(locks, "appointments.view")).toEqual({
            key: "appointments.view",
            checked: true,
            disabled: true,
            reason: "cascade"
        })
    })

    it("libera Ver agendamentos quando o alvo não tem Gerenciar agendamentos", () => {
        const locks = permissionLocks(
            actorWith(["users.manage", "appointments.view"]),
            buildUserAccount({ permissions: ["appointments.view"] })
        )

        expect(lockOf(locks, "appointments.view")?.disabled).toBe(false)
    })

    it("não bloqueia nada de uma conta comum quando o ator é Admin", () => {
        const locks = permissionLocks(
            actorWith([], true),
            buildUserAccount({ permissions: ["appointments.view", "appointments.manage"] })
        )

        expect(locks.every((lock) => !lock.disabled && lock.reason === "none")).toBe(true)
    })
})
