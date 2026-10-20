import { describe, expect, it } from "vitest"
import type { BusyAppointment } from "../types/userAccount.types"
import { countFreeStaff, findResponsibleConflict, ResponsibleCandidate } from "./responsibleAvailability"

const AT_13_00 = new Date("2030-03-12T16:00:00.000Z")

function minutesAfter(base: Date, minutes: number): Date {
    return new Date(base.getTime() + minutes * 60_000)
}

function candidate(overrides: Partial<ResponsibleCandidate> = {}): ResponsibleCandidate {
    return { id: 7, active: true, isAdmin: false, permissions: ["appointments.view", "appointments.manage"], ...overrides }
}

function busyAt(appointmentDatetime: Date, overrides: Partial<BusyAppointment> = {}): BusyAppointment {
    return { appointmentId: "500", protocol: "BUSY0001", assignedUserId: 7, appointmentDatetime, ...overrides }
}

function conflictFor(busy: BusyAppointment[], slotMinutes: number | null, at: Date = AT_13_00, appointmentId = "100") {
    return findResponsibleConflict({ candidate: candidate(), appointmentId, appointmentDatetime: at, slotMinutes, busy })
}

describe("findResponsibleConflict", () => {
    it("devolve null quando o candidato esta livre", () => {
        expect(conflictFor([], 30)).toBeNull()
    })

    it("devolve UNAVAILABLE quando o candidato nao pode ser responsavel", () => {
        const inactive = findResponsibleConflict({
            candidate: candidate({ active: false }),
            appointmentId: "100",
            appointmentDatetime: AT_13_00,
            slotMinutes: 30,
            busy: [],
        })
        const withoutManage = findResponsibleConflict({
            candidate: candidate({ permissions: ["appointments.view"] }),
            appointmentId: "100",
            appointmentDatetime: AT_13_00,
            slotMinutes: 30,
            busy: [],
        })

        expect(inactive).toEqual({ reason: "UNAVAILABLE" })
        expect(withoutManage).toEqual({ reason: "UNAVAILABLE" })
    })

    it("aceita o Admin mesmo sem appointments.manage", () => {
        const result = findResponsibleConflict({
            candidate: candidate({ isAdmin: true, permissions: [] }),
            appointmentId: "100",
            appointmentDatetime: AT_13_00,
            slotMinutes: 30,
            busy: [],
        })

        expect(result).toBeNull()
    })

    it("devolve BUSY com o agendamento que conflita quando o inicio e o mesmo", () => {
        expect(conflictFor([busyAt(AT_13_00)], 30)).toEqual({ reason: "BUSY", appointmentId: "500", protocol: "BUSY0001" })
    })

    it("devolve BUSY para 13:00 contra 13:20 com 30 minutos", () => {
        expect(conflictFor([busyAt(minutesAfter(AT_13_00, 20))], 30)).toEqual({
            reason: "BUSY",
            appointmentId: "500",
            protocol: "BUSY0001",
        })
    })

    it("devolve null para 13:00 contra 13:30 com 30 minutos", () => {
        expect(conflictFor([busyAt(minutesAfter(AT_13_00, 30))], 30)).toBeNull()
        expect(conflictFor([busyAt(minutesAfter(AT_13_00, -30))], 30)).toBeNull()
    })

    it("devolve BUSY para 13:00 contra 13:40 com 60 minutos", () => {
        expect(conflictFor([busyAt(minutesAfter(AT_13_00, 40))], 60)?.reason).toBe("BUSY")
    })

    it("ignora o proprio agendamento e os de outras contas", () => {
        const busy = [busyAt(AT_13_00, { appointmentId: "100" }), busyAt(AT_13_00, { appointmentId: "501", assignedUserId: 8 })]

        expect(conflictFor(busy, 30)).toBeNull()
    })

    it("compara so o inicio quando nao ha duracao configurada", () => {
        expect(conflictFor([busyAt(minutesAfter(AT_13_00, 1))], null)).toBeNull()
        expect(conflictFor([busyAt(AT_13_00)], null)?.reason).toBe("BUSY")
    })
})

describe("countFreeStaff", () => {
    const eligible = [candidate({ id: 7 }), candidate({ id: 8 }), candidate({ id: 9 })]

    it("conta todos quando ninguem esta ocupado", () => {
        expect(countFreeStaff({ eligible, appointmentDatetime: AT_13_00, slotMinutes: 30, busy: [] })).toBe(3)
    })

    it("desconta quem tem um agendamento sobreposto", () => {
        const busy = [busyAt(AT_13_00, { assignedUserId: 7 }), busyAt(minutesAfter(AT_13_00, 30), { assignedUserId: 8 })]

        expect(countFreeStaff({ eligible, appointmentDatetime: AT_13_00, slotMinutes: 30, busy })).toBe(2)
    })

    it("devolve 0 quando todos estao ocupados", () => {
        const busy = eligible.map((staff, index) =>
            busyAt(minutesAfter(AT_13_00, 10), { assignedUserId: staff.id, appointmentId: String(600 + index) }),
        )

        expect(countFreeStaff({ eligible, appointmentDatetime: AT_13_00, slotMinutes: 30, busy })).toBe(0)
    })

    it("nao conta conta inativa ou sem appointments.manage", () => {
        const mixed = [candidate({ id: 7 }), candidate({ id: 8, active: false }), candidate({ id: 9, permissions: [] })]

        expect(countFreeStaff({ eligible: mixed, appointmentDatetime: AT_13_00, slotMinutes: 30, busy: [] })).toBe(1)
    })
})
