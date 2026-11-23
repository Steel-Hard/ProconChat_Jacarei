import { describe, expect, it } from "vitest"
import type { Permission } from "../types/auth.types"
import type {
    AccountBatchDecision,
    AccountBatchState,
    AccountChange,
    BusyAppointment,
    LockedAccount,
    ReassignableAppointment,
    RuleAccount,
} from "../types/userAccount.types"
import { decideAccountBatch } from "./userAccountRules"

const MANAGE_AND_VIEW: Permission[] = ["appointments.view", "appointments.manage"]
const AT_13_00 = new Date("2030-03-12T16:00:00.000Z")
const manager = { id: 1, isAdmin: false, permissions: ["users.manage", ...MANAGE_AND_VIEW] as Permission[] }

function minutesAfter(minutes: number): Date {
    return new Date(AT_13_00.getTime() + minutes * 60_000)
}

function future(appointmentId: string, appointmentDatetime: Date = AT_13_00): ReassignableAppointment {
    return { appointmentId, protocol: `P${appointmentId.padStart(7, "0")}`, appointmentDatetime }
}

function account(id: number, overrides: Partial<LockedAccount> = {}): LockedAccount {
    return { id, isAdmin: false, active: true, permissions: MANAGE_AND_VIEW, futureAppointments: [], ...overrides }
}

function target(id: number, overrides: Partial<RuleAccount> = {}): RuleAccount {
    return { id, isAdmin: false, active: true, permissions: MANAGE_AND_VIEW, ...overrides }
}

function busy(assignedUserId: number, appointmentDatetime: Date, appointmentId = "900"): BusyAppointment {
    return { appointmentId, protocol: `B${appointmentId.padStart(7, "0")}`, assignedUserId, appointmentDatetime }
}

function decide(accounts: LockedAccount[], changes: AccountChange[], overrides: Partial<AccountBatchState> = {}) {
    return decideAccountBatch({ requester: manager, accounts, changes, targets: [], slotMinutes: 30, busy: [], ...overrides })
}

function errorOf(decision: AccountBatchDecision) {
    if (decision.allowed) {
        throw new Error("Era esperada uma recusa")
    }
    return { status: decision.error.statusCode, code: decision.error.code, details: decision.error.details }
}

function plansOf(decision: AccountBatchDecision) {
    if (!decision.allowed) {
        throw new Error(`Recusa inesperada: ${decision.error.code}`)
    }
    return decision.plans
}

const withFuture = (id: number, ...appointments: ReassignableAppointment[]) =>
    account(id, { futureAppointments: appointments.length > 0 ? appointments : [future(String(id * 10))] })

describe("decideAccountBatch: ordem do lote", () => {
    it("devolve o erro da conta de menor userId quando dois itens falham", () => {
        const decision = decide(
            [account(5, { permissions: ["reports.view"] }), account(3, { permissions: ["reports.view"] })],
            [
                { userId: 5, active: false },
                { userId: 3, permissions: [] },
            ],
        )

        expect(errorOf(decision)).toEqual({ status: 403, code: "PERMISSION_NOT_HELD", details: { userId: 3 } })
    })

    it("devolve os planos em ordem crescente de userId", () => {
        const plans = plansOf(decide([account(9), account(4)], [{ userId: 9, active: false }, { userId: 4, active: false }]))

        expect(plans.map((plan) => plan.userId)).toEqual([4, 9])
    })

    it("so exige redistribuicao depois de todas as checagens de permissao", () => {
        const decision = decide([withFuture(3), account(8, { permissions: ["reports.view"] })], [
            { userId: 3, active: false },
            { userId: 8, active: false },
        ])

        expect(errorOf(decision)).toEqual({ status: 403, code: "TARGET_HAS_MORE_PERMISSIONS", details: { userId: 8 } })
    })
})

describe("decideAccountBatch: redistribuicao", () => {
    it("exige reassignment de quem e desativado com agendamentos futuros", () => {
        expect(errorOf(decide([withFuture(5)], [{ userId: 5, active: false }]))).toEqual({
            status: 409,
            code: "REASSIGNMENT_REQUIRED",
            details: { userId: 5 },
        })
    })

    it("exige reassignment de quem perde appointments.manage com agendamentos futuros", () => {
        expect(errorOf(decide([withFuture(5)], [{ userId: 5, permissions: ["appointments.view"] }])).code).toBe(
            "REASSIGNMENT_REQUIRED",
        )
    })

    it("volta para pendente com o motivo de perder appointments.manage", () => {
        const [plan] = plansOf(
            decide([withFuture(5)], [{ userId: 5, permissions: ["appointments.view"], reassignment: { mode: "pending" } }]),
        )

        expect(plan?.reassignment).toEqual({
            mode: "pending",
            reason: "MANAGE_PERMISSION_REMOVED",
            appointments: [future("50")],
        })
    })

    it("usa um motivo so, USER_DEACTIVATED, quando o item desativa e tira appointments.manage", () => {
        const [plan] = plansOf(
            decide([withFuture(5)], [{ userId: 5, active: false, permissions: [], reassignment: { mode: "pending" } }]),
        )

        expect(plan?.reassignment?.reason).toBe("USER_DEACTIVATED")
        expect(plan?.bumpSessionVersion).toBe(true)
    })

    it("ignora o reassignment quando nao ha perda ou nao ha agendamentos futuros", () => {
        const plans = plansOf(
            decide([withFuture(5), account(6)], [
                { userId: 5, permissions: [...MANAGE_AND_VIEW, "users.manage"], reassignment: { mode: "pending" } },
                { userId: 6, active: false, reassignment: { mode: "assign", toUserId: 999 } },
            ]),
        )

        expect(plans.map((plan) => plan.reassignment)).toEqual([null, null])
    })

    it("atribui ao destino de fora do lote valido", () => {
        const [plan] = plansOf(
            decide([withFuture(5)], [{ userId: 5, active: false, reassignment: { mode: "assign", toUserId: 7 } }], {
                targets: [target(7)],
            }),
        )

        expect(plan?.reassignment).toEqual({
            mode: "assign",
            reason: "USER_DEACTIVATED",
            toUserId: 7,
            appointments: [future("50")],
        })
    })

    it("aceita o Admin como destino", () => {
        const decision = decide([withFuture(5)], [{ userId: 5, active: false, reassignment: { mode: "assign", toUserId: 2 } }], {
            targets: [target(2, { isAdmin: true, permissions: [] })],
        })

        expect(plansOf(decision)[0]?.reassignment?.mode).toBe("assign")
    })

    it.each([
        ["inexistente", 99, []],
        ["inativo", 7, [target(7, { active: false })]],
        ["sem appointments.manage", 7, [target(7, { permissions: ["appointments.view"] })]],
        ["a propria conta alterada", 5, []],
    ] as [string, number, RuleAccount[]][])("recusa o destino %s", (_label, toUserId, targets) => {
        const decision = decide([withFuture(5)], [{ userId: 5, active: false, reassignment: { mode: "assign", toUserId } }], {
            targets,
        })

        expect(errorOf(decision)).toEqual({ status: 409, code: "INVALID_REASSIGNMENT_TARGET", details: { userId: 5 } })
    })

    it("aceita o destino que ganha appointments.manage no mesmo lote", () => {
        const decision = decide([withFuture(5), account(6, { permissions: [] })], [
            { userId: 5, active: false, reassignment: { mode: "assign", toUserId: 6 } },
            { userId: 6, permissions: ["appointments.manage"] },
        ])

        expect(plansOf(decision)[0]?.reassignment).toMatchObject({ mode: "assign", toUserId: 6 })
    })

    it("recusa o destino que e desativado no mesmo lote", () => {
        const decision = decide([withFuture(5), account(6)], [
            { userId: 5, active: false, reassignment: { mode: "assign", toUserId: 6 } },
            { userId: 6, active: false },
        ])

        expect(errorOf(decision)).toEqual({ status: 409, code: "INVALID_REASSIGNMENT_TARGET", details: { userId: 5 } })
    })

    it("recusa o destino que perde appointments.manage no mesmo lote", () => {
        const decision = decide([withFuture(5), account(6)], [
            { userId: 5, active: false, reassignment: { mode: "assign", toUserId: 6 } },
            { userId: 6, permissions: ["appointments.view"] },
        ])

        expect(errorOf(decision).code).toBe("INVALID_REASSIGNMENT_TARGET")
    })

    it("recusa duas contas que apontam uma para a outra e perdem appointments.manage", () => {
        const decision = decide([withFuture(5), withFuture(6)], [
            { userId: 5, permissions: ["appointments.view"], reassignment: { mode: "assign", toUserId: 6 } },
            { userId: 6, permissions: ["appointments.view"], reassignment: { mode: "assign", toUserId: 5 } },
        ])

        expect(errorOf(decision)).toEqual({ status: 409, code: "INVALID_REASSIGNMENT_TARGET", details: { userId: 5 } })
    })
})

describe("decideAccountBatch: destino ocupado", () => {
    it("recusa o destino com CONFIRMED sobreposto e devolve os dois protocolos", () => {
        const decision = decide(
            [withFuture(5, future("51", AT_13_00))],
            [{ userId: 5, active: false, reassignment: { mode: "assign", toUserId: 7 } }],
            { targets: [target(7)], busy: [busy(7, minutesAfter(20))] },
        )

        expect(errorOf(decision)).toEqual({
            status: 409,
            code: "REASSIGNMENT_TARGET_BUSY",
            details: { userId: 5, toUserId: 7, protocol: "P0000051", conflictingProtocol: "B0000900" },
        })
    })

    it("aceita o destino com CONFIRMED adjacente", () => {
        const decision = decide(
            [withFuture(5, future("51", AT_13_00))],
            [{ userId: 5, active: false, reassignment: { mode: "assign", toUserId: 7 } }],
            { targets: [target(7)], busy: [busy(7, minutesAfter(30))] },
        )

        expect(plansOf(decision)[0]?.reassignment?.mode).toBe("assign")
    })

    it("recusa duas contas do lote que levam agendamentos sobrepostos ao mesmo destino", () => {
        const decision = decide(
            [withFuture(5, future("51", AT_13_00)), withFuture(6, future("61", minutesAfter(10)))],
            [
                { userId: 5, active: false, reassignment: { mode: "assign", toUserId: 7 } },
                { userId: 6, active: false, reassignment: { mode: "assign", toUserId: 7 } },
            ],
            { targets: [target(7)] },
        )

        expect(errorOf(decision)).toEqual({
            status: 409,
            code: "REASSIGNMENT_TARGET_BUSY",
            details: { userId: 6, toUserId: 7, protocol: "P0000061", conflictingProtocol: "P0000051" },
        })
    })

    it("devolve INVALID_REASSIGNMENT_TARGET antes de REASSIGNMENT_TARGET_BUSY", () => {
        const decision = decide(
            [withFuture(5, future("51", AT_13_00))],
            [{ userId: 5, active: false, reassignment: { mode: "assign", toUserId: 7 } }],
            { targets: [target(7, { active: false })], busy: [busy(7, AT_13_00)] },
        )

        expect(errorOf(decision).code).toBe("INVALID_REASSIGNMENT_TARGET")
    })
})
