import { describe, expect, it } from "vitest"
import buildUserAccount from "@/testUtils/buildUserAccount"
import buildAccountBatch from "@/utils/users/buildAccountBatch"

describe("buildAccountBatch", () => {
    it("monta um item por conta alterada, em ordem crescente de userId", () => {
        const accounts = [
            buildUserAccount({ id: 12, permissions: ["reports.view"] }),
            buildUserAccount({ id: 7, active: true, permissions: ["appointments.view"] })
        ]

        const batch = buildAccountBatch(accounts, {
            12: { permissions: ["users.manage", "reports.view"] },
            7: { active: false }
        })

        expect(batch).toEqual({
            changes: [
                { userId: 7, active: false },
                { userId: 12, permissions: ["reports.view", "users.manage"] }
            ]
        })
    })

    it("envia a redistribuição sem a contagem nem o motivo", () => {
        const accounts = [
            buildUserAccount({ id: 7, permissions: ["appointments.view", "appointments.manage"] }),
            buildUserAccount({ id: 9 })
        ]

        const batch = buildAccountBatch(accounts, {
            7: {
                permissions: ["appointments.view"],
                reassignment: { mode: "assign", toUserId: 1, count: 2, reason: "manageRemoved" }
            },
            9: {
                active: false,
                reassignment: { mode: "pending", count: 1, reason: "deactivate" }
            }
        })

        expect(batch).toEqual({
            changes: [
                {
                    userId: 7,
                    permissions: ["appointments.view"],
                    reassignment: { mode: "assign", toUserId: 1 }
                },
                { userId: 9, active: false, reassignment: { mode: "pending" } }
            ]
        })
    })

    it("não envia permissões nem ativo iguais aos salvos, nem conta sem diferença", () => {
        const accounts = [buildUserAccount({ id: 7, active: true, permissions: ["reports.view"] })]

        const batch = buildAccountBatch(accounts, {
            7: { active: true, permissions: ["reports.view"] }
        })

        expect(batch).toEqual({ changes: [] })
    })
})
