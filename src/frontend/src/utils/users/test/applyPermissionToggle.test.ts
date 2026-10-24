import { describe, expect, it } from "vitest"
import applyPermissionToggle from "@/utils/users/applyPermissionToggle"

describe("applyPermissionToggle", () => {
    it("marca a permissão e devolve o conjunto na ordem das chaves", () => {
        expect(applyPermissionToggle(["users.manage"], "content.manage")).toEqual([
            "content.manage",
            "users.manage"
        ])
    })

    it("desmarca a permissão que estava marcada", () => {
        expect(applyPermissionToggle(["content.manage", "users.manage"], "users.manage")).toEqual([
            "content.manage"
        ])
    })

    it("marca Ver agendamentos junto ao marcar Gerenciar agendamentos", () => {
        expect(applyPermissionToggle([], "appointments.manage")).toEqual([
            "appointments.view",
            "appointments.manage"
        ])
    })

    it("desmarca Gerenciar agendamentos junto ao desmarcar Ver agendamentos", () => {
        expect(
            applyPermissionToggle(
                ["appointments.view", "appointments.manage", "reports.view"],
                "appointments.view"
            )
        ).toEqual(["reports.view"])
    })

    it("mantém Ver agendamentos ao desmarcar só Gerenciar agendamentos", () => {
        expect(
            applyPermissionToggle(
                ["appointments.view", "appointments.manage"],
                "appointments.manage"
            )
        ).toEqual(["appointments.view"])
    })
})
