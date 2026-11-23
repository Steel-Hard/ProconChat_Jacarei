import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { assignAppointment, returnAppointmentToPending } from "../../repositories/appointmentReassignment"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { appointmentState, createTestUser, deleteTestUsers, eventsOf, TestUser } from "./helpers/usersDb"

const NOW = new Date("2031-01-10T12:00:00.000Z")

describe("Gravações da redistribuição de agendamentos com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let actor: TestUser
    let from: TestUser
    let to: TestUser
    let scope: OwnedAppointmentScope
    let slot = 0

    async function confirmedOf(owner: TestUser): Promise<number> {
        slot += 1
        return createTestAppointment(scope, {
            status: "CONFIRMED",
            assignedUserId: owner.id,
            appointmentDatetime: new Date(Date.UTC(2031, 2, slot, 13)),
        })
    }

    beforeAll(async () => {
        actor = await createTestUser({ isAdmin: true })
        from = await createTestUser({ permissions: ["appointments.view", "appointments.manage"] })
        to = await createTestUser({ permissions: ["appointments.view", "appointments.manage"] })
        createdUserIds.push(actor.createdId, from.id, to.id)
        scope = await createAppointmentScope(actor.id, "reassignment")
    })

    afterAll(async () => {
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("atribui o agendamento ao destino e grava o evento ASSIGNED com o data recebido", async () => {
        const appointmentId = await confirmedOf(from)
        const client = await getPool().connect()

        try {
            await assignAppointment(client, {
                appointmentId: String(appointmentId),
                assigneeUserId: to.id,
                actorUserId: actor.id,
                data: { assignee_user_id: to.id, reason: "USER_DEACTIVATED" },
                now: NOW,
            })
        } finally {
            client.release()
        }

        expect(await appointmentState(appointmentId)).toEqual({ status: "CONFIRMED", assignedUserId: to.id })
        expect(await eventsOf([appointmentId])).toEqual([
            {
                appointmentId,
                type: "ASSIGNED",
                actorUserId: actor.id,
                data: { assignee_user_id: to.id, reason: "USER_DEACTIVATED" },
                createdAt: NOW.toISOString(),
            },
        ])
    })

    it("volta o agendamento para pendente sem responsavel e grava BACK_TO_PENDING com o data recebido", async () => {
        const appointmentId = await confirmedOf(from)
        const client = await getPool().connect()

        try {
            await returnAppointmentToPending(client, {
                appointmentId: String(appointmentId),
                actorUserId: actor.id,
                data: { reason: "MANAGE_PERMISSION_REMOVED" },
                now: NOW,
            })
        } finally {
            client.release()
        }

        expect(await appointmentState(appointmentId)).toEqual({ status: "PENDING", assignedUserId: null })
        expect(await eventsOf([appointmentId])).toEqual([
            {
                appointmentId,
                type: "BACK_TO_PENDING",
                actorUserId: actor.id,
                data: { reason: "MANAGE_PERMISSION_REMOVED" },
                createdAt: NOW.toISOString(),
            },
        ])
    })

    it("desfaz as duas gravacoes quando quem chamou faz ROLLBACK", async () => {
        const assigned = await confirmedOf(from)
        const returned = await confirmedOf(from)
        const client = await getPool().connect()

        try {
            await client.query("BEGIN")
            await assignAppointment(client, {
                appointmentId: String(assigned),
                assigneeUserId: to.id,
                actorUserId: actor.id,
                data: { assignee_user_id: to.id },
                now: NOW,
            })
            await returnAppointmentToPending(client, {
                appointmentId: String(returned),
                actorUserId: actor.id,
                data: { reason: "USER_DEACTIVATED" },
                now: NOW,
            })
            await client.query("ROLLBACK")
        } finally {
            client.release()
        }

        expect(await appointmentState(assigned)).toEqual({ status: "CONFIRMED", assignedUserId: from.id })
        expect(await appointmentState(returned)).toEqual({ status: "CONFIRMED", assignedUserId: from.id })
        expect(await eventsOf([assigned, returned])).toEqual([])
    })
})
