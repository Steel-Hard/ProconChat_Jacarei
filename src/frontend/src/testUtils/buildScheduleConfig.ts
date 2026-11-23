import type ScheduleConfigView from "@/types/schedule/ScheduleConfigView.types"

function buildScheduleConfig(overrides: Partial<ScheduleConfigView> = {}): ScheduleConfigView {
    return {
        slotMinutes: 30,
        seatsPerSlot: 2,
        windowDays: 30,
        minNoticeDays: 1,
        waitAlertDays: 7,
        unitAddress: "Av. Nove de Julho, 215 - Centro, Jacareí - SP",
        unitAddressComplement: "Sala 2",
        reminderEnabled: true,
        reminderHours: 24,
        ranges: [1, 2, 3, 4, 5].flatMap((weekday) => [
            { weekday, slotIndex: 1, startTime: "08:30", endTime: "11:30" },
            { weekday, slotIndex: 2, startTime: "13:30", endTime: "16:30" }
        ]),
        blockedDates: [
            {
                date: "2026-11-02",
                startTime: null,
                endTime: null,
                description: "Finados (feriado nacional)"
            }
        ],
        updatedBy: { id: 1, name: "Ana Paula Souza" },
        updatedAt: "2026-10-20T13:00:00.000Z",
        ...overrides
    }
}

export default buildScheduleConfig
