import { describe, expect, it, vi } from "vitest"
import ForbiddenError from "../../errors/ForbiddenError"
import type { AccountBatchDecision, UserAccount } from "../../types/userAccount.types"
import { UserAccountRepositoryStub } from "./userAccountStub.repository"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const REQUESTER = { id: 1, isAdmin: false, permissions: ["users.manage" as const] }

function account(id: number, overrides: Partial<UserAccount> = {}): UserAccount {
    return {
        id,
        name: `Conta ${id}`,
        email: `conta${id}@exemplo.test`,
        isAdmin: false,
        active: true,
        permissions: [],
        lastLoginAt: null,
        permissionsUpdatedAt: null,
        permissionsUpdatedBy: null,
        ...overrides,
    }
}

describe("UserAccountRepositoryStub", () => {
    it("monta o estado do lote com as contas, os destinos de fora e os agendamentos futuros", async () => {
        const stub = new UserAccountRepositoryStub({
            accounts: [account(1), account(5, { permissions: ["appointments.view", "appointments.manage"] }), account(7)],
            futureAppointments: {
                5: [{ id: "50", protocol: "P0000050", name: "Titular", appointmentDatetime: "2031-02-01T13:00:00.000Z", status: "CONFIRMED" }],
            },
            slotMinutes: 30,
        })
        const decide = vi.fn((): AccountBatchDecision => ({ allowed: true, plans: [] }))
        const changes = [{ userId: 5, active: false, reassignment: { mode: "assign" as const, toUserId: 7 } }]

        await stub.applyAccountBatch({ requester: REQUESTER, changes, now: NOW }, decide)

        expect(decide).toHaveBeenCalledWith({
            requester: REQUESTER,
            changes,
            accounts: [
                {
                    id: 5,
                    isAdmin: false,
                    active: true,
                    permissions: ["appointments.view", "appointments.manage"],
                    futureAppointments: [
                        { appointmentId: "50", protocol: "P0000050", appointmentDatetime: new Date("2031-02-01T13:00:00.000Z") },
                    ],
                },
            ],
            targets: [{ id: 7, isAdmin: false, active: true, permissions: [] }],
            slotMinutes: 30,
            busy: [],
        })
    })

    it("propaga o erro da decisao sem mudar as contas", async () => {
        const stub = new UserAccountRepositoryStub({ accounts: [account(1), account(5)] })
        const error = new ForbiddenError("recusado", "PERMISSION_NOT_HELD", { userId: 5 })
        const before = await stub.listAccounts()

        const attempt = stub.applyAccountBatch(
            { requester: REQUESTER, changes: [{ userId: 5, active: false }], now: NOW },
            () => ({ allowed: false, error }),
        )

        await expect(attempt).rejects.toBe(error)
        expect(await stub.listAccounts()).toEqual(before)
    })

    it("aplica o plano recebido e soma os agendamentos redistribuidos", async () => {
        const stub = new UserAccountRepositoryStub({
            accounts: [account(1, { name: "Paula" }), account(5, { permissions: ["appointments.view"] })],
        })
        const decision: AccountBatchDecision = {
            allowed: true,
            plans: [
                {
                    userId: 5,
                    grant: ["sessions.view"],
                    revoke: ["appointments.view"],
                    active: false,
                    bumpSessionVersion: true,
                    recordUpdate: true,
                    reassignment: {
                        mode: "pending",
                        reason: "USER_DEACTIVATED",
                        appointments: [{ appointmentId: "50", protocol: "P", appointmentDatetime: NOW }],
                    },
                },
            ],
        }

        const result = await stub.applyAccountBatch(
            { requester: REQUESTER, changes: [{ userId: 5, active: false }], now: NOW },
            () => decision,
        )

        expect(result.redistributed).toBe(1)
        expect(result.items[1]).toMatchObject({
            active: false,
            permissions: ["sessions.view"],
            permissionsUpdatedAt: NOW.toISOString(),
            permissionsUpdatedBy: { id: 1, name: "Paula" },
        })
        expect(result.lastChange).toEqual({ name: "Paula", at: NOW.toISOString() })
    })
})
