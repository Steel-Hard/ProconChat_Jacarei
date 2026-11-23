import { describe, expect, it } from "vitest"
import buildUserAccount from "@/testUtils/buildUserAccount"
import updateDraftEntry from "@/utils/users/updateDraftEntry"

const saved = buildUserAccount({ id: 7, permissions: ["appointments.view"], active: true })

describe("updateDraftEntry", () => {
    it("grava a mudança da conta no rascunho sem mexer nas outras", () => {
        const draft = { 3: { active: false } }

        expect(updateDraftEntry(draft, saved, { permissions: ["reports.view"] })).toEqual({
            3: { active: false },
            7: { permissions: ["reports.view"] }
        })
    })

    it("tira do rascunho o campo que voltou ao valor salvo", () => {
        const draft = { 7: { permissions: ["reports.view" as const], active: false } }

        expect(updateDraftEntry(draft, saved, { active: true })).toEqual({
            7: { permissions: ["reports.view"] }
        })
    })

    it("tira a conta inteira do rascunho quando não sobra diferença", () => {
        const draft = {
            7: {
                active: false,
                reassignment: { mode: "pending" as const, count: 2, reason: "deactivate" as const }
            }
        }

        expect(updateDraftEntry(draft, saved, { active: true })).toEqual({})
    })

    it("compara as permissões como conjunto", () => {
        const draft = { 7: { permissions: ["reports.view" as const] } }

        expect(updateDraftEntry(draft, saved, { permissions: ["appointments.view"] })).toEqual({})
    })

    it("guarda e remove a redistribuição da conta", () => {
        const reassignment = { mode: "pending" as const, count: 1, reason: "deactivate" as const }
        const withReassignment = updateDraftEntry({}, saved, { active: false, reassignment })

        const withoutReassignment = updateDraftEntry(withReassignment, saved, {
            reassignment: undefined
        })

        expect(withReassignment).toEqual({ 7: { active: false, reassignment } })
        expect(withoutReassignment).toEqual({ 7: { active: false } })
    })
})
