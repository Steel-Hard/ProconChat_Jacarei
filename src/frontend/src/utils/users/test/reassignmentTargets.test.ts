import { describe, expect, it } from "vitest"
import buildUserAccount from "@/testUtils/buildUserAccount"
import reassignmentTargets from "@/utils/users/reassignmentTargets"

describe("reassignmentTargets", () => {
    it("lista as outras contas ativas que são Admin ou gerenciam agendamentos", () => {
        const admin = buildUserAccount({ id: 1, isAdmin: true })
        const manager = buildUserAccount({
            id: 3,
            permissions: ["appointments.view", "appointments.manage"]
        })
        const target = buildUserAccount({
            id: 7,
            permissions: ["appointments.view", "appointments.manage"]
        })
        const inactiveManager = buildUserAccount({
            id: 8,
            active: false,
            permissions: ["appointments.view", "appointments.manage"]
        })
        const reader = buildUserAccount({ id: 9, permissions: ["appointments.view"] })

        const result = reassignmentTargets([admin, manager, target, inactiveManager, reader], 7)

        expect(result).toEqual([admin, manager])
    })
})
