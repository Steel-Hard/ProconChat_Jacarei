import { describe, expect, it } from "vitest"
import buildUserAccount from "@/testUtils/buildUserAccount"
import capacityLossReason from "@/utils/users/capacityLossReason"

const manager = buildUserAccount({
    active: true,
    permissions: ["appointments.view", "appointments.manage"]
})

describe("capacityLossReason", () => {
    it("devolve deactivate em qualquer desativação, mesmo sem Gerenciar agendamentos", () => {
        const reader = buildUserAccount({ active: true, permissions: ["reports.view"] })

        expect(capacityLossReason(reader, { ...reader, active: false })).toBe("deactivate")
    })

    it("devolve manageRemoved ao tirar Gerenciar agendamentos de uma conta ativa", () => {
        expect(
            capacityLossReason(manager, { ...manager, permissions: ["appointments.view"] })
        ).toBe("manageRemoved")
    })

    it("devolve deactivate quando desativa e tira Gerenciar agendamentos juntos", () => {
        expect(capacityLossReason(manager, { ...manager, active: false, permissions: [] })).toBe(
            "deactivate"
        )
    })

    it("não devolve nada ao tirar Gerenciar agendamentos de uma conta já inativa", () => {
        const inactive = { ...manager, active: false }

        expect(capacityLossReason(inactive, { ...inactive, permissions: [] })).toBeNull()
    })

    it("não devolve nada ao reativar ou ao marcar outra permissão", () => {
        const inactive = { ...manager, active: false }

        expect(capacityLossReason(inactive, manager)).toBeNull()
        expect(
            capacityLossReason(manager, {
                ...manager,
                permissions: [...manager.permissions, "reports.view"]
            })
        ).toBeNull()
    })
})
