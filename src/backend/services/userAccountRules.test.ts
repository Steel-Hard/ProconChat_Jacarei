import { describe, expect, it } from "vitest"
import { PERMISSIONS, Permission } from "../types/auth.types"
import type {
    AccountBatchDecision,
    AccountBatchState,
    AccountChange,
    AccountRequester,
    LockedAccount,
    PasswordResetDecision,
} from "../types/userAccount.types"
import { decideAccountBatch, decidePasswordReset, isValidResponsible, normalizePermissions } from "./userAccountRules"

const MANAGE_AND_VIEW: Permission[] = ["appointments.view", "appointments.manage"]

function requester(permissions: Permission[], overrides: Partial<AccountRequester> = {}): AccountRequester {
    return { id: 1, isAdmin: false, permissions, ...overrides }
}

function account(id: number, overrides: Partial<LockedAccount> = {}): LockedAccount {
    return { id, isAdmin: false, active: true, permissions: [], futureAppointments: [], ...overrides }
}

function batch(
    by: AccountRequester,
    accounts: LockedAccount[],
    changes: AccountChange[],
    overrides: Partial<AccountBatchState> = {},
): AccountBatchDecision {
    return decideAccountBatch({ requester: by, accounts, changes, targets: [], slotMinutes: 30, busy: [], ...overrides })
}

function errorOf(decision: AccountBatchDecision | PasswordResetDecision) {
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

const userManager = requester(["users.manage", "appointments.view"])

describe("normalizePermissions", () => {
    it("acrescenta appointments.view quando ha appointments.manage e ordena pelo catalogo", () => {
        expect(normalizePermissions(["users.manage", "appointments.manage"])).toEqual([
            "appointments.view",
            "appointments.manage",
            "users.manage",
        ])
    })

    it("nao acrescenta nada quando nao ha appointments.manage", () => {
        expect(normalizePermissions(["sessions.view", "appointments.view"])).toEqual(["appointments.view", "sessions.view"])
        expect(normalizePermissions([])).toEqual([])
    })
})

describe("isValidResponsible", () => {
    it("aceita conta ativa com appointments.manage ou o Admin ativo", () => {
        expect(isValidResponsible({ active: true, isAdmin: false, permissions: MANAGE_AND_VIEW })).toBe(true)
        expect(isValidResponsible({ active: true, isAdmin: true, permissions: [] })).toBe(true)
    })

    it("recusa conta inativa ou sem appointments.manage", () => {
        expect(isValidResponsible({ active: false, isAdmin: false, permissions: MANAGE_AND_VIEW })).toBe(false)
        expect(isValidResponsible({ active: true, isAdmin: false, permissions: ["appointments.view"] })).toBe(false)
    })
})

describe("decideAccountBatch: checagens de cada item", () => {
    it("recusa com 404 e o userId a conta que nao existe", () => {
        expect(errorOf(batch(userManager, [], [{ userId: 9, active: false }]))).toEqual({
            status: 404,
            code: "NOT_FOUND",
            details: { userId: 9 },
        })
    })

    it("recusa a propria conta com SELF_ACCOUNT_LOCKED", () => {
        const decision = batch(userManager, [account(1, { permissions: ["users.manage"] })], [{ userId: 1, permissions: [] }])

        expect(errorOf(decision)).toEqual({ status: 403, code: "SELF_ACCOUNT_LOCKED", details: { userId: 1 } })
    })

    it("recusa o Admin como alvo com ADMIN_ACCOUNT_LOCKED, mesmo quando quem pede e o Admin", () => {
        const admin = requester([...PERMISSIONS], { id: 1, isAdmin: true })
        const decision = batch(admin, [account(1, { isAdmin: true })], [{ userId: 1, active: false }])

        expect(errorOf(decision)).toEqual({ status: 403, code: "ADMIN_ACCOUNT_LOCKED", details: { userId: 1 } })
    })

    it("recusa conceder uma permissao que quem pede nao tem", () => {
        const decision = batch(userManager, [account(5)], [{ userId: 5, permissions: ["reports.view"] }])

        expect(errorOf(decision)).toEqual({ status: 403, code: "PERMISSION_NOT_HELD", details: { userId: 5 } })
    })

    it("recusa remover uma permissao que quem pede nao tem", () => {
        const decision = batch(
            userManager,
            [account(5, { permissions: ["reports.view", "sessions.view"] })],
            [{ userId: 5, permissions: ["sessions.view"] }],
        )

        expect(errorOf(decision)).toEqual({ status: 403, code: "PERMISSION_NOT_HELD", details: { userId: 5 } })
    })

    it("recusa tirar ver e gerenciar agendamentos de quem tem as duas quando quem pede nao gerencia", () => {
        const decision = batch(userManager, [account(5, { permissions: MANAGE_AND_VIEW })], [{ userId: 5, permissions: [] }])

        expect(errorOf(decision)).toEqual({ status: 403, code: "PERMISSION_NOT_HELD", details: { userId: 5 } })
    })

    it("grava appointments.view junto quando o conjunto pedido so tem appointments.manage", () => {
        const manager = requester(["users.manage", ...MANAGE_AND_VIEW])

        const [plan] = plansOf(batch(manager, [account(5)], [{ userId: 5, permissions: ["appointments.manage"] }]))

        expect(plan?.grant).toEqual(["appointments.view", "appointments.manage"])
        expect(plan?.revoke).toEqual([])
    })

    it("aceita editar so com permissoes que quem pede tem uma conta que tem outras permissoes", () => {
        const decision = batch(
            userManager,
            [account(5, { permissions: ["reports.view"] })],
            [{ userId: 5, permissions: ["appointments.view", "reports.view"] }],
        )

        expect(plansOf(decision)).toEqual([
            {
                userId: 5,
                grant: ["appointments.view"],
                revoke: [],
                active: null,
                bumpSessionVersion: false,
                recordUpdate: true,
                reassignment: null,
            },
        ])
    })

    it("recusa mudar active de conta com permissao que quem pede nao tem", () => {
        const decision = batch(userManager, [account(5, { permissions: ["reports.view"] })], [{ userId: 5, active: false }])

        expect(errorOf(decision)).toEqual({ status: 403, code: "TARGET_HAS_MORE_PERMISSIONS", details: { userId: 5 } })
    })

    it("nao confere TARGET_HAS_MORE_PERMISSIONS quando active pedido e o atual", () => {
        const decision = batch(userManager, [account(5, { permissions: ["reports.view"] })], [{ userId: 5, active: true }])

        expect(plansOf(decision)[0]?.recordUpdate).toBe(false)
    })

    it("deixa o Admin conceder, remover e desativar qualquer conta de funcionario", () => {
        const admin = requester([...PERMISSIONS], { isAdmin: true })

        const [plan] = plansOf(
            batch(admin, [account(5, { permissions: ["reports.view"] })], [{ userId: 5, active: false, permissions: ["sessions.view"] }]),
        )

        expect(plan).toMatchObject({ grant: ["sessions.view"], revoke: ["reports.view"], active: false })
    })

    it("devolve um plano vazio quando o item pede o estado atual", () => {
        const decision = batch(
            userManager,
            [account(5, { permissions: ["appointments.view"] })],
            [{ userId: 5, permissions: ["appointments.view"], active: true }],
        )

        expect(plansOf(decision)).toEqual([
            { userId: 5, grant: [], revoke: [], active: null, bumpSessionVersion: false, recordUpdate: false, reassignment: null },
        ])
    })

    it("incrementa session_version ao desativar e nao ao reativar", () => {
        const plans = plansOf(
            batch(userManager, [account(5), account(6, { active: false })], [
                { userId: 6, active: true },
                { userId: 5, active: false },
            ]),
        )

        expect(plans.map((plan) => [plan.userId, plan.active, plan.bumpSessionVersion, plan.recordUpdate])).toEqual([
            [5, false, true, true],
            [6, true, false, true],
        ])
    })
})

describe("decidePasswordReset", () => {
    const staff = { id: 5, isAdmin: false, active: true, permissions: ["appointments.view"] as Permission[] }

    it("aceita redefinir a senha de outra conta, mesmo inativa", () => {
        expect(decidePasswordReset({ requester: userManager, userId: 5, account: staff })).toEqual({ allowed: true })
        expect(decidePasswordReset({ requester: userManager, userId: 5, account: { ...staff, active: false } })).toEqual({
            allowed: true,
        })
    })

    it("recusa conta inexistente, Admin, a propria e conta com mais permissoes", () => {
        const cases = [
            decidePasswordReset({ requester: userManager, userId: 5, account: null }),
            decidePasswordReset({ requester: userManager, userId: 9, account: { ...staff, id: 9, isAdmin: true } }),
            decidePasswordReset({ requester: userManager, userId: 1, account: { ...staff, id: 1 } }),
            decidePasswordReset({ requester: userManager, userId: 5, account: { ...staff, permissions: ["reports.view"] } }),
        ]

        expect(cases.map((decision) => errorOf(decision).code)).toEqual([
            "NOT_FOUND",
            "ADMIN_ACCOUNT_LOCKED",
            "SELF_ACCOUNT_LOCKED",
            "TARGET_HAS_MORE_PERMISSIONS",
        ])
    })

    it("deixa o Admin redefinir a senha de qualquer funcionario", () => {
        const admin = requester([...PERMISSIONS], { isAdmin: true })

        expect(
            decidePasswordReset({ requester: admin, userId: 5, account: { ...staff, permissions: [...PERMISSIONS] } }),
        ).toEqual({ allowed: true })
    })
})
