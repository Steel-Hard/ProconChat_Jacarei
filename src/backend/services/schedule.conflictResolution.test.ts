import { describe, expect, it, vi } from "vitest"
import { createScheduleStubRepository, DEFAULT_STUB_NOW } from "../repositories/mock/scheduleStub.repository"
import { createScheduleService } from "./schedule.service"
import { buildScheduleConfigInput } from "./mock/scheduleConfig.builders"
import type { ScheduleConflictResolutionSummary } from "../types/schedule.types"

function makeAppointment(id: string, protocol: string, iso: string) {
    return {
        id,
        protocol,
        name: `Cidadão ${id}`,
        cpfMasked: "***.111.222-**",
        appointmentDatetime: new Date(iso),
        requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
        status: "CONFIRMED" as const,
        assignedUserId: null,
        offGrid: false,
    }
}

describe("schedule.service conflict resolution", () => {
    it("mantém agendamentos afetados fora da grade sem enviar avisos", async () => {
        const repo = createScheduleStubRepository({
            appointments: [
                makeAppointment("10", "AAA11111", "2026-10-06T08:00:00-03:00"),
                makeAppointment("11", "BBB22222", "2026-10-06T08:30:00-03:00"),
            ],
        })
        const notifyCancellation = vi.fn()
        const service = createScheduleService(repo, {
            cancellationNotice: {
                isEnabled: vi.fn().mockResolvedValue(true),
                getState: vi.fn().mockResolvedValue({ enabled: true, problem: null }),
            },
            notifications: { notifyCancellation },
        })

        let summary: ScheduleConflictResolutionSummary | undefined
        const input = buildScheduleConfigInput({
            ranges: [],
            conflictResolution: "KEEP",
        })

        await service.saveConfig(input, 1, DEFAULT_STUB_NOW, {
            onResolution: (result) => {
                summary = result
            },
        })

        expect(summary).toEqual({
            action: "KEEP",
            affectedCount: 2,
            notifiedCount: 0,
            failedCount: 0,
            noticeDisabled: false,
        })
        expect(notifyCancellation).not.toHaveBeenCalled()
        const remaining = await repo.listFutureActiveAppointments(DEFAULT_STUB_NOW)
        expect(remaining.every((item) => item.offGrid)).toBe(true)
    })

    it("cancela agendamentos com aviso ligado e contabiliza falhas sem desfazer cancelamentos", async () => {
        const repo = createScheduleStubRepository({
            appointments: [
                makeAppointment("10", "AAA11111", "2026-10-06T08:00:00-03:00"),
                makeAppointment("11", "BBB22222", "2026-10-06T08:30:00-03:00"),
                makeAppointment("12", "CCC33333", "2026-10-06T09:00:00-03:00"),
            ],
        })
        const notifyCancellation = vi
            .fn()
            .mockResolvedValueOnce("NOTIFIED")
            .mockResolvedValueOnce("FAILED")
            .mockRejectedValueOnce(new Error("gateway down"))

        const service = createScheduleService(repo, {
            cancellationNotice: {
                isEnabled: vi.fn().mockResolvedValue(true),
                getState: vi.fn().mockResolvedValue({ enabled: true, problem: null }),
            },
            notifications: { notifyCancellation },
        })

        let summary: ScheduleConflictResolutionSummary | undefined
        const input = buildScheduleConfigInput({
            ranges: [],
            conflictResolution: "CANCEL",
        })

        await service.saveConfig(input, 1, DEFAULT_STUB_NOW, {
            onResolution: (result) => {
                summary = result
            },
        })

        expect(notifyCancellation).toHaveBeenCalledTimes(3)
        expect(notifyCancellation).toHaveBeenNthCalledWith(1, "10", 1, DEFAULT_STUB_NOW)
        expect(notifyCancellation).toHaveBeenNthCalledWith(2, "11", 1, DEFAULT_STUB_NOW)
        expect(notifyCancellation).toHaveBeenNthCalledWith(3, "12", 1, DEFAULT_STUB_NOW)
        expect(summary).toEqual({
            action: "CANCEL",
            affectedCount: 3,
            notifiedCount: 1,
            failedCount: 2,
            noticeDisabled: false,
        })
        const remaining = await repo.listFutureActiveAppointments(DEFAULT_STUB_NOW)
        expect(remaining).toHaveLength(0)
    })

    it("cancela agendamentos sem enviar avisos quando o interruptor está desligado", async () => {
        const repo = createScheduleStubRepository({
            appointments: [makeAppointment("10", "AAA11111", "2026-10-06T08:00:00-03:00")],
        })
        const notifyCancellation = vi.fn()
        const service = createScheduleService(repo, {
            cancellationNotice: {
                isEnabled: vi.fn().mockResolvedValue(false),
                getState: vi.fn().mockResolvedValue({ enabled: false, problem: null }),
            },
            notifications: { notifyCancellation },
        })

        let summary: ScheduleConflictResolutionSummary | undefined
        await service.saveConfig(
            buildScheduleConfigInput({ ranges: [], conflictResolution: "CANCEL" }),
            1,
            DEFAULT_STUB_NOW,
            {
                onResolution: (result) => {
                    summary = result
                },
            },
        )

        expect(notifyCancellation).not.toHaveBeenCalled()
        expect(summary).toEqual({
            action: "CANCEL",
            affectedCount: 1,
            notifiedCount: 0,
            failedCount: 0,
            noticeDisabled: true,
        })
    })

    it("não salva a agenda quando a configuração do aviso não pode ser lida", async () => {
        const repo = createScheduleStubRepository({
            appointments: [makeAppointment("10", "AAA11111", "2026-10-06T08:00:00-03:00")],
        })
        const service = createScheduleService(repo, {
            cancellationNotice: {
                isEnabled: vi.fn().mockRejectedValue(new Error("db error")),
                getState: vi.fn().mockRejectedValue(new Error("db error")),
            },
            notifications: { notifyCancellation: vi.fn() },
        })

        await expect(
            service.saveConfig(
                buildScheduleConfigInput({ ranges: [], conflictResolution: "CANCEL" }),
                1,
                DEFAULT_STUB_NOW,
            ),
        ).rejects.toThrow("db error")

        const remaining = await repo.listFutureActiveAppointments(DEFAULT_STUB_NOW)
        expect(remaining).toHaveLength(1)
    })
})
