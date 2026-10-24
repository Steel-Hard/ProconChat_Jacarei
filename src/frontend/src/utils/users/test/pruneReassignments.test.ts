import { describe, expect, it } from "vitest"
import buildUserAccount from "@/testUtils/buildUserAccount"
import pruneReassignments from "@/utils/users/pruneReassignments"

const reassignment = { mode: "pending" as const, count: 2, reason: "manageRemoved" as const }

describe("pruneReassignments", () => {
    it("remove a redistribuição da conta que voltou a poder atender", () => {
        const accounts = [
            buildUserAccount({ id: 7, active: true, permissions: ["appointments.view"] })
        ]
        const draft = {
            7: {
                permissions: ["appointments.view" as const, "appointments.manage" as const],
                reassignment
            }
        }

        expect(pruneReassignments(draft, accounts)).toEqual({
            7: { permissions: ["appointments.view", "appointments.manage"] }
        })
    })

    it("mantém a redistribuição da conta que continua sem poder atender", () => {
        const accounts = [
            buildUserAccount({
                id: 7,
                active: true,
                permissions: ["appointments.view", "appointments.manage"]
            })
        ]
        const draft = { 7: { active: false, reassignment } }

        expect(pruneReassignments(draft, accounts)).toEqual(draft)
    })

    it("mantém a redistribuição da conta reativada que ainda está sem Gerenciar agendamentos", () => {
        const accounts = [
            buildUserAccount({
                id: 7,
                active: true,
                permissions: ["appointments.view", "appointments.manage"]
            })
        ]
        const draft = { 7: { permissions: ["appointments.view" as const], reassignment } }

        expect(pruneReassignments(draft, accounts)).toEqual(draft)
    })
})
