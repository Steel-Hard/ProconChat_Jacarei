import { buildDefaultScheduleConfigView } from "../../repositories/mock/scheduleStub.repository"
import { FutureActiveAppointment, ScheduleConfigInput } from "../../types/schedule.types"

export function buildScheduleConfigInput(overrides: Partial<ScheduleConfigInput> = {}): ScheduleConfigInput {
    const def = buildDefaultScheduleConfigView()
    return {
        slotMinutes: def.slotMinutes,
        seatsPerSlot: def.seatsPerSlot,
        windowDays: def.windowDays,
        minNoticeDays: def.minNoticeDays,
        waitAlertDays: def.waitAlertDays,
        unitAddress: def.unitAddress,
        unitAddressComplement: def.unitAddressComplement,
        reminderEnabled: def.reminderEnabled,
        reminderHours: def.reminderHours,
        ranges: def.ranges,
        blockedDates: def.blockedDates,
        ...overrides,
    }
}

let futureAppointmentSeq = 0

export function buildFutureAppointment(overrides: Partial<FutureActiveAppointment> = {}): FutureActiveAppointment {
    futureAppointmentSeq += 1
    return {
        id: String(futureAppointmentSeq),
        protocol: `PROT${String(futureAppointmentSeq).padStart(4, "0")}`,
        name: "Cidadão Teste",
        cpfMasked: "***.123.456-**",
        appointmentDatetime: new Date("2026-10-06T09:00:00-03:00"),
        requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
        status: "PENDING",
        assignedUserId: null,
        offGrid: false,
        ...overrides,
    }
}
