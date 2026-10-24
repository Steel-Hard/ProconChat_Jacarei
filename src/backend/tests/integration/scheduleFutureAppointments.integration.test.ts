import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { scheduleRepository } from "../../repositories/schedule.repository"
import type { AppointmentStatus } from "../../types/appointment.types"
import { addDaysToDateString, getLocalParts, parseLocalDate } from "../../utils/date.utils"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const LOCK_TIMEOUT_MS = 3_000

function inDays(days: number, time: string): Date {
    return parseLocalDate(addDaysToDateString(getLocalParts(new Date()).dateStr, days), time)
}

describe("Leitura sem trava dos agendamentos futuros ativos (Postgres)", () => {
    const createdUserIds: (number | null)[] = []
    let admin: TestUser
    let scope: OwnedAppointmentScope

    async function appointment(status: AppointmentStatus, appointmentDatetime: Date): Promise<string> {
        const id = await createTestAppointment(scope, {
            status,
            appointmentDatetime,
            cpfHash: randomBytes(32).toString("hex"),
        })
        return String(id)
    }

    function ownRows<T extends { id: string }>(rows: T[]): T[] {
        const own = new Set(scope.createdAppointmentIds.map(String))
        return rows.filter((row) => own.has(row.id))
    }

    beforeAll(async () => {
        admin = await createTestUser({ isAdmin: true })
        createdUserIds.push(admin.createdId)
        scope = await createAppointmentScope(admin.id, "schedule_future_read")
    })

    afterAll(async () => {
        try {
            await deleteAppointmentScope(scope)
            await deleteTestUsers(createdUserIds)
        } finally {
            await getPool().end()
        }
    })

    it("devolve só os pendentes e confirmados futuros, com offGrid, na ordem por data e id", async () => {
        const pending = await appointment("PENDING", inDays(5, "09:00"))
        const confirmed = await appointment("CONFIRMED", inDays(4, "10:00"))
        const sameTime = await appointment("PENDING", inDays(5, "09:00"))
        await appointment("CANCELED", inDays(3, "09:00"))
        await appointment("ATTENDED", inDays(3, "09:30"))
        await appointment("NO_SHOW", inDays(3, "10:00"))
        await appointment("PENDING", inDays(-2, "09:00"))
        await getPool().query("UPDATE Appointments SET off_grid = TRUE WHERE id = $1", [confirmed])

        const rows = ownRows(await scheduleRepository.listFutureActiveAppointments(new Date()))

        expect(rows.map((row) => [row.id, row.status, row.offGrid])).toEqual([
            [confirmed, "CONFIRMED", true],
            [pending, "PENDING", false],
            [sameTime, "PENDING", false],
        ])
    })

    it("conta como futuro só o que é depois do instante recebido", async () => {
        const later = await appointment("PENDING", inDays(6, "08:00"))
        await appointment("PENDING", inDays(6, "07:00"))

        const rows = ownRows(
            await scheduleRepository.listFutureActiveAppointments(inDays(6, "07:00")),
        )

        expect(rows.map((row) => row.id)).toContain(later)
        expect(rows.every((row) => row.appointmentDatetime > inDays(6, "07:00"))).toBe(true)
    })

    it("lê mesmo com a linha do agendamento travada por outra transação", async () => {
        const id = await appointment("PENDING", inDays(7, "09:00"))
        const blocker = await getPool().connect()
        try {
            await blocker.query("BEGIN")
            await blocker.query("SELECT id FROM Appointments WHERE id = $1 FOR UPDATE", [id])

            const result = await Promise.race([
                scheduleRepository.listFutureActiveAppointments(new Date()),
                new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), LOCK_TIMEOUT_MS)),
            ])

            expect(result).not.toBe("timeout")
            expect(ownRows(result === "timeout" ? [] : result).map((row) => row.id)).toContain(id)
        } finally {
            await blocker.query("ROLLBACK")
            blocker.release()
        }
    })
})
