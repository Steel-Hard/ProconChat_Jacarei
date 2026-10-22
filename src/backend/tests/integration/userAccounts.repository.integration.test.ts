import bcrypt from "bcryptjs"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import ConflictError from "../../errors/ConflictError"
import { createUserAccountRepository } from "../../repositories/userAccount.repository"
import { decideAccountBatch, decidePasswordReset } from "../../services/userAccountRules"
import { PERMISSIONS } from "../../types/auth.types"
import type { AccountRequester } from "../../types/userAccount.types"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    firstRow,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { accountRows, createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const repository = createUserAccountRepository()

describe("Repositório de contas com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let manager: TestUser
    let requester: AccountRequester
    let scope: OwnedAppointmentScope

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    async function sessionVersionOf(id: number): Promise<number> {
        return firstRow(
            (await getPool().query<{ session_version: number }>("SELECT session_version FROM Users WHERE id = $1", [id])).rows,
        ).session_version
    }

    beforeAll(async () => {
        admin = await user({ isAdmin: true })
        manager = await user({ permissions: ["appointments.view", "appointments.manage", "users.manage"] })
        requester = { id: manager.id, isAdmin: false, permissions: ["appointments.view", "appointments.manage", "users.manage"] }
        scope = await createAppointmentScope(admin.id, "accounts_repo")
    })

    afterAll(async () => {
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("cria a conta ativa, sem permissoes e sem ser Admin", async () => {
        const email = `nova-${process.pid}-${Date.now()}@teste.local`

        const created = await repository.createAccount({ name: "Conta Nova", email, passwordHash: "hash-novo" })
        createdUserIds.push(created.id)

        expect(created).toEqual({
            id: created.id,
            name: "Conta Nova",
            email,
            isAdmin: false,
            active: true,
            permissions: [],
            lastLoginAt: null,
            permissionsUpdatedAt: null,
            permissionsUpdatedBy: null,
        })
    })

    it("recusa com EMAIL_ALREADY_IN_USE o e-mail que ja existe com outras maiusculas", async () => {
        const existing = await user({})

        const attempt = repository.createAccount({ name: "Repetida", email: existing.email.toUpperCase(), passwordHash: "x" })

        await expect(attempt).rejects.toBeInstanceOf(ConflictError)
        await expect(attempt).rejects.toMatchObject({ code: "EMAIL_ALREADY_IN_USE", statusCode: 409 })
    })

    it("grava so uma de duas criacoes simultaneas com o mesmo e-mail", async () => {
        const email = `corrida-${process.pid}-${Date.now()}@teste.local`

        const results = await Promise.allSettled([
            repository.createAccount({ name: "Corrida A", email, passwordHash: "a" }),
            repository.createAccount({ name: "Corrida B", email, passwordHash: "b" }),
        ])
        for (const result of results) {
            if (result.status === "fulfilled") {
                createdUserIds.push(result.value.id)
            }
        }

        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
        const rejected = results.find((result) => result.status === "rejected")
        expect(rejected?.status === "rejected" && rejected.reason).toMatchObject({ code: "EMAIL_ALREADY_IN_USE" })
        expect((await getPool().query("SELECT 1 FROM Users WHERE lower(email) = $1", [email])).rowCount).toBe(1)
    })

    it("lista o Admin primeiro, depois as ativas por nome e por fim as inativas por nome", async () => {
        const zeta = await user({ name: "Zeta Ordem" })
        const alfaInativa = await user({ name: "Alfa Ordem", active: false })
        const beta = await user({ name: "Beta Ordem" })
        const gamaInativa = await user({ name: "Gama Ordem", active: false })
        const ids = [admin.id, zeta.id, alfaInativa.id, beta.id, gamaInativa.id]

        const list = await repository.listAccounts()

        expect(list.items.filter((item) => ids.includes(item.id)).map((item) => item.id)).toEqual([
            admin.id,
            beta.id,
            zeta.id,
            alfaInativa.id,
            gamaInativa.id,
        ])
        expect(list.items.find((item) => item.id === admin.id)?.permissions).toEqual([...PERMISSIONS])
    })

    it("devolve so os CONFIRMED futuros da conta, com o nome do titular, em ordem de data", async () => {
        const owner = await user({ permissions: ["appointments.view", "appointments.manage"] })
        const other = await user({ permissions: ["appointments.view", "appointments.manage"] })
        const later = await createTestAppointment(scope, {
            name: "Titular Depois",
            status: "CONFIRMED",
            assignedUserId: owner.id,
            appointmentDatetime: new Date("2031-02-02T13:00:00.000Z"),
        })
        const sooner = await createTestAppointment(scope, {
            name: "Titular Antes",
            status: "CONFIRMED",
            assignedUserId: owner.id,
            appointmentDatetime: new Date("2031-02-01T13:00:00.000Z"),
        })
        await createTestAppointment(scope, { status: "PENDING", appointmentDatetime: new Date("2031-02-03T13:00:00.000Z") })
        await createTestAppointment(scope, {
            status: "CONFIRMED",
            assignedUserId: owner.id,
            appointmentDatetime: new Date("2031-01-01T13:00:00.000Z"),
        })
        await createTestAppointment(scope, {
            status: "CANCELED",
            assignedUserId: owner.id,
            appointmentDatetime: new Date("2031-02-04T13:00:00.000Z"),
        })
        await createTestAppointment(scope, {
            status: "CONFIRMED",
            assignedUserId: other.id,
            appointmentDatetime: new Date("2031-02-05T13:00:00.000Z"),
        })

        const future = await repository.findFutureAppointments(owner.id, NOW)

        expect(future?.map((appointment) => [appointment.id, appointment.name, appointment.status])).toEqual([
            [String(sooner), "Titular Antes", "CONFIRMED"],
            [String(later), "Titular Depois", "CONFIRMED"],
        ])
        expect(future?.[0]).toEqual({
            id: String(sooner),
            protocol: expect.stringMatching(/^[0-9A-F]{8}$/),
            name: "Titular Antes",
            appointmentDatetime: "2031-02-01T13:00:00.000Z",
            status: "CONFIRMED",
        })
    })

    it("devolve null nos agendamentos futuros de conta inexistente", async () => {
        expect(await repository.findFutureAppointments(2 ** 40, NOW)).toBeNull()
    })

    it("incrementa session_version ao desativar e nao ao reativar", async () => {
        const staff = await user({})
        const before = await sessionVersionOf(staff.id)

        await repository.applyAccountBatch({ requester, changes: [{ userId: staff.id, active: false }], now: NOW }, decideAccountBatch)
        const afterDeactivate = await sessionVersionOf(staff.id)
        await repository.applyAccountBatch({ requester, changes: [{ userId: staff.id, active: true }], now: NOW }, decideAccountBatch)

        expect(afterDeactivate).toBe(before + 1)
        expect(await sessionVersionOf(staff.id)).toBe(before + 1)
    })

    it("grava o alterado por e as linhas novas com granted_by e granted_at so nas contas que mudaram", async () => {
        const changed = await user({})
        const unchanged = await user({ permissions: ["appointments.view"] })

        const result = await repository.applyAccountBatch(
            {
                requester,
                changes: [
                    { userId: changed.id, permissions: ["appointments.manage"] },
                    { userId: unchanged.id, permissions: ["appointments.view"], active: true },
                ],
                now: NOW,
            },
            decideAccountBatch,
        )

        const rows = await getPool().query(
            "SELECT permission_key, granted_by, granted_at FROM UserPermissions WHERE user_id = $1 ORDER BY permission_key",
            [changed.id],
        )
        expect(rows.rows).toEqual([
            { permission_key: "appointments.manage", granted_by: String(manager.id), granted_at: NOW },
            { permission_key: "appointments.view", granted_by: String(manager.id), granted_at: NOW },
        ])
        const changedItem = result.items.find((item) => item.id === changed.id)
        const unchangedItem = result.items.find((item) => item.id === unchanged.id)
        expect(changedItem).toMatchObject({
            permissions: ["appointments.view", "appointments.manage"],
            permissionsUpdatedAt: NOW.toISOString(),
            permissionsUpdatedBy: { id: manager.id, name: manager.name },
        })
        expect(unchangedItem).toMatchObject({ permissionsUpdatedAt: null, permissionsUpdatedBy: null })
        expect(result.redistributed).toBe(0)
    })

    it("devolve em lastChange quem fez a alteracao mais recente", async () => {
        const staff = await user({})
        const latest = new Date("2099-01-01T00:00:00.000Z")

        const result = await repository.applyAccountBatch(
            { requester, changes: [{ userId: staff.id, permissions: ["appointments.view"] }], now: latest },
            decideAccountBatch,
        )

        expect(result.lastChange).toEqual({ name: manager.name, at: latest.toISOString() })
        expect((await repository.listAccounts()).lastChange).toEqual({ name: manager.name, at: latest.toISOString() })
    })

    it("redefine a senha trocando o hash e incrementando session_version, mesmo com a conta inativa", async () => {
        const staff = await user({ active: false })
        const before = await sessionVersionOf(staff.id)
        const passwordHash = await bcrypt.hash("senha-redefinida", 4)

        await repository.resetPassword({ requester, userId: staff.id, passwordHash }, decidePasswordReset)

        const row = firstRow(
            (await getPool().query<{ password_hash: string }>("SELECT password_hash FROM Users WHERE id = $1", [staff.id])).rows,
        )
        expect(row.password_hash).toBe(passwordHash)
        expect(await sessionVersionOf(staff.id)).toBe(before + 1)
    })

    it("nao muda nada quando a redefinicao e recusada", async () => {
        const stronger = await user({ permissions: ["reports.view"] })
        const before = await accountRows([stronger.id])

        const attempt = repository.resetPassword({ requester, userId: stronger.id, passwordHash: "outro" }, decidePasswordReset)

        await expect(attempt).rejects.toMatchObject({ code: "TARGET_HAS_MORE_PERMISSIONS" })
        expect(await accountRows([stronger.id])).toEqual(before)
    })
})
