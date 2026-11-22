import { describe, expect, it, vi } from "vitest"
import { createScheduleStubRepository, DEFAULT_STUB_NOW } from "../repositories/mock/scheduleStub.repository"
import { createScheduleService } from "./schedule.service"
import { buildScheduleConfigInput } from "./mock/scheduleConfig.builders"
import type { ScheduleCancellationNoticeState, ScheduleConflictResolutionSummary } from "../types/schedule.types"

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
        repo.setCancellationNoticeEnabled(false)
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
        repo.setCancellationNoticeReadError(new Error("db error"))
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

type NotifyCancellation = (id: string, actorUserId: number, now?: Date) => Promise<"NOTIFIED" | "FAILED">

describe("schedule.service cancelamento de mudança agendada com resolução", () => {
    const versionDate = "2026-10-12"
    const saturday = makeAppointment("21", "SAB21111", "2026-10-17T10:00:00-03:00")
    const secondSaturday = makeAppointment("22", "SAB22222", "2026-10-17T10:30:00-03:00")
    const unusedNoticeReader = {
        isEnabled: vi.fn().mockRejectedValue(new Error("não deve ler o aviso antes da gravação")),
        getState: vi.fn().mockResolvedValue({ enabled: true, problem: null }),
    }

    function buildService(
        appointments: ReturnType<typeof makeAppointment>[],
        notifyCancellation: NotifyCancellation,
        noticeEnabled = true,
    ) {
        const repo = createScheduleStubRepository({ appointments })
        repo.setCancellationNoticeEnabled(noticeEnabled)
        const service = createScheduleService(repo, {
            cancellationNotice: unusedNoticeReader,
            notifications: { notifyCancellation },
        })
        return { repo, service }
    }

    async function deleteWith(
        service: ReturnType<typeof createScheduleService>,
        resolution: "KEEP" | "CANCEL",
        seenConflictIds: string[],
        seenNoticeEnabled?: boolean,
    ): Promise<ScheduleConflictResolutionSummary | undefined> {
        let summary: ScheduleConflictResolutionSummary | undefined
        await service.deleteScheduledConfig(versionDate, DEFAULT_STUB_NOW, {
            actorUserId: 1,
            conflictResolution: resolution,
            seenConflictIds,
            seenNoticeEnabled,
            onResolution: (result) => {
                summary = result
            },
        })
        return summary
    }

    it("mantém os agendamentos fora da grade, sem enviar avisos, ao escolher Manter", async () => {
        const notifyCancellation = vi.fn()
        const { repo, service } = buildService([saturday], notifyCancellation)

        const summary = await deleteWith(service, "KEEP", ["21"])

        expect(summary).toEqual({
            action: "KEEP",
            affectedCount: 1,
            notifiedCount: 0,
            failedCount: 0,
            noticeDisabled: false,
        })
        expect(notifyCancellation).not.toHaveBeenCalled()
        const [kept] = await repo.listFutureActiveAppointments(DEFAULT_STUB_NOW)
        expect(kept?.offGrid).toBe(true)
    })

    it("cancela e envia um aviso por agendamento afetado quando o aviso está ligado", async () => {
        const notifyCancellation = vi.fn().mockResolvedValue("NOTIFIED")
        const { repo, service } = buildService([saturday, secondSaturday], notifyCancellation)

        const summary = await deleteWith(service, "CANCEL", ["21", "22"], true)

        expect(summary).toEqual({
            action: "CANCEL",
            affectedCount: 2,
            notifiedCount: 2,
            failedCount: 0,
            noticeDisabled: false,
        })
        expect(notifyCancellation).toHaveBeenCalledTimes(2)
        expect(await repo.listFutureActiveAppointments(DEFAULT_STUB_NOW)).toEqual([])
    })

    it("cancela sem enviar nada e marca o aviso como desligado quando o aviso está desligado", async () => {
        const notifyCancellation = vi.fn()
        const { repo, service } = buildService([saturday], notifyCancellation, false)

        const summary = await deleteWith(service, "CANCEL", ["21"], false)

        expect(summary).toEqual({
            action: "CANCEL",
            affectedCount: 1,
            notifiedCount: 0,
            failedCount: 0,
            noticeDisabled: true,
        })
        expect(notifyCancellation).not.toHaveBeenCalled()
        expect(await repo.listFutureActiveAppointments(DEFAULT_STUB_NOW)).toEqual([])
    })

    it("mantém os cancelamentos e conta as falhas quando um envio falha", async () => {
        const notifyCancellation = vi
            .fn()
            .mockResolvedValueOnce("NOTIFIED")
            .mockRejectedValueOnce(new Error("gateway down"))
        const { repo, service } = buildService([saturday, secondSaturday], notifyCancellation)

        const summary = await deleteWith(service, "CANCEL", ["21", "22"], true)

        expect(summary).toMatchObject({ affectedCount: 2, notifiedCount: 1, failedCount: 1 })
        expect(await repo.listFutureActiveAppointments(DEFAULT_STUB_NOW)).toEqual([])
    })

    it("não envia aviso quando a lista refeita está vazia, mesmo com o aviso ligado", async () => {
        const notifyCancellation = vi.fn()
        const { service } = buildService([], notifyCancellation)

        const summary = await deleteWith(service, "CANCEL", ["21"], true)

        expect(summary).toEqual({
            action: "CANCEL",
            affectedCount: 0,
            notifiedCount: 0,
            failedCount: 0,
            noticeDisabled: false,
        })
        expect(notifyCancellation).not.toHaveBeenCalled()
    })

    it("recusa com 409 SCHEDULE_CONFLICTS_CHANGED quando o aviso mudou, sem enviar nem cancelar", async () => {
        const notifyCancellation = vi.fn()
        const { repo, service } = buildService([saturday], notifyCancellation, false)

        await expect(deleteWith(service, "CANCEL", ["21"], true)).rejects.toMatchObject({
            statusCode: 409,
            code: "SCHEDULE_CONFLICTS_CHANGED",
            details: { changes: ["NOTICE"], cancellationNotice: { enabled: false, problem: null } },
        })
        expect(notifyCancellation).not.toHaveBeenCalled()
        expect(await repo.listFutureActiveAppointments(DEFAULT_STUB_NOW)).toHaveLength(1)
    })
})

describe("schedule.service problema do aviso nos 409", () => {
    const problem = {
        code: "PAYMENT_METHOD" as const,
        metaErrorCode: "131042",
        message: "a conta da Meta está sem forma de pagamento",
    }

    function buildFailingSave(getState: () => Promise<ScheduleCancellationNoticeState>, noticeEnabled: boolean) {
        const repo = createScheduleStubRepository({
            appointments: [makeAppointment("10", "AAA11111", "2026-10-06T08:00:00-03:00")],
        })
        repo.setCancellationNoticeEnabled(noticeEnabled)
        const service = createScheduleService(repo, {
            cancellationNotice: { isEnabled: vi.fn(), getState },
            notifications: { notifyCancellation: vi.fn() },
        })
        return service.saveConfig(buildScheduleConfigInput({ ranges: [] }), 1, DEFAULT_STUB_NOW)
    }

    it("completa o problema do aviso no 409 quando o aviso está ligado", async () => {
        const getState = vi.fn().mockResolvedValue({ enabled: true, problem })

        await expect(buildFailingSave(getState, true)).rejects.toMatchObject({
            code: "SCHEDULE_CONFLICTS",
            details: { cancellationNotice: { enabled: true, problem } },
        })
    })

    it("devolve problema nulo quando a leitura do estado do aviso falha", async () => {
        const getState = vi.fn().mockRejectedValue(new Error("db error"))

        await expect(buildFailingSave(getState, true)).rejects.toMatchObject({
            code: "SCHEDULE_CONFLICTS",
            details: { cancellationNotice: { enabled: true, problem: null } },
        })
    })

    it("não consulta o estado do aviso quando ele está desligado", async () => {
        const getState = vi.fn<() => Promise<ScheduleCancellationNoticeState>>()

        await expect(buildFailingSave(getState, false)).rejects.toMatchObject({
            details: { cancellationNotice: { enabled: false, problem: null } },
        })
        expect(getState).not.toHaveBeenCalled()
    })
})
