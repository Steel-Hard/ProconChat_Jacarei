import { describe, expect, it } from "vitest"
import buildUserAccount from "@/testUtils/buildUserAccount"
import effectiveAccounts from "@/utils/users/effectiveAccounts"

describe("effectiveAccounts", () => {
    it("aplica o rascunho sobre as contas e mantém a ordem da API", () => {
        const admin = buildUserAccount({ id: 1, isAdmin: true })
        const bruno = buildUserAccount({ id: 7, permissions: ["reports.view"] })
        const carla = buildUserAccount({ id: 3, name: "Carla" })

        const result = effectiveAccounts([admin, bruno, carla], {
            7: { permissions: ["users.manage"] },
            3: { active: false }
        })

        expect(result.map((account) => account.id)).toEqual([1, 7, 3])
        expect(result[0]).toBe(admin)
        expect(result[1]).toEqual({ ...bruno, permissions: ["users.manage"] })
        expect(result[2]).toEqual({ ...carla, active: false })
    })
})
