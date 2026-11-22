import { describe, expect, it } from "vitest"
import ConflictError from "../../errors/ConflictError"
import NotFoundError from "../../errors/NotFoundError"
import ScheduleNotConfiguredError from "../../errors/ScheduleNotConfiguredError"
import { normalizeAndValidateScheduleConfig } from "../../services/scheduleRules"
import {
    buildDefaultScheduleConfigView,
    createScheduleStubRepository,
} from "./scheduleStub.repository"

describe("scheduleStub.repository", () => {
    it("retorna null quando configurado sem dados iniciais e lança ScheduleNotConfiguredError ao agendar", async () => {
        const repo = createScheduleStubRepository({ config: null })

        expect(await repo.getSettings()).toBeNull()
        expect(await repo.getRanges()).toEqual([])
        expect(await repo.getBlockedDates("2026-10-01", "2026-10-31")).toEqual([])
        expect(await repo.getConfig()).toBeNull()

        await expect(
            repo.bookAppointment({
                sessionId: "1",
                questionId: 1,
                reason: "REQUIRES_IN_PERSON",
                name: "Teste",
                cpfHash: "hash",
                cpfMasked: "***.000.000-**",
                byRepresentative: false,
                appointmentDatetime: new Date("2026-10-06T08:00:00-03:00"),
            }),
        ).rejects.toBeInstanceOf(ScheduleNotConfiguredError)
    })

    it("ignora agendamentos off-grid ao validar conflitos em saveConfig", async () => {
        const repo = createScheduleStubRepository({
            appointments: [
                {
                    id: "99",
                    protocol: "OFFGRID1",
                    name: "Atendimento Encaixe",
                    cpfMasked: "***.111.111-**",
                    appointmentDatetime: new Date("2026-10-06T08:00:00-03:00"),
                    requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
                    status: "CONFIRMED",
                    offGrid: true,
                },
            ],
        })

        const base = buildDefaultScheduleConfigView()
        const normalized = normalizeAndValidateScheduleConfig({
            ...base,
            blockedDates: [
                {
                    date: "2026-10-06",
                    startTime: null,
                    endTime: null,
                    description: "Bloqueio total",
                },
            ],
        })

        const saved = await repo.saveConfig({
            config: normalized,
            actorUserId: 2,
            now: new Date("2026-10-05T09:00:00-03:00"),
        })

        expect(saved.blockedDates).toHaveLength(1)
        expect(saved.updatedBy).toEqual({ id: 2, name: "Patrícia Lima" })
    })

    it("lança ConflictError quando agendamento normal é afetado", async () => {
        const repo = createScheduleStubRepository({
            appointments: [
                {
                    id: "100",
                    protocol: "NORMAL01",
                    name: "Atendimento Normal",
                    cpfMasked: "***.222.222-**",
                    appointmentDatetime: new Date("2026-10-06T08:00:00-03:00"),
                    requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
                    status: "PENDING",
                },
            ],
        })

        const base = buildDefaultScheduleConfigView()
        const normalized = normalizeAndValidateScheduleConfig({
            ...base,
            blockedDates: [
                {
                    date: "2026-10-06",
                    startTime: null,
                    endTime: null,
                    description: "Bloqueio total",
                },
            ],
        })

        await expect(
            repo.saveConfig({
                config: normalized,
                actorUserId: 2,
                now: new Date("2026-10-05T09:00:00-03:00"),
            }),
        ).rejects.toBeInstanceOf(ConflictError)
    })

    it("devolve os agendamentos configurados sem filtrar e guarda o instante recebido", async () => {
        const repo = createScheduleStubRepository({
            appointments: [
                {
                    id: "7",
                    protocol: "PASSADO1",
                    name: "Agendamento Passado",
                    cpfMasked: "***.333.333-**",
                    appointmentDatetime: new Date("2026-10-01T08:00:00-03:00"),
                    requestDatetime: new Date("2026-09-20T10:00:00-03:00"),
                    status: "PENDING",
                },
            ],
        })
        const now = new Date("2026-10-05T09:00:00-03:00")

        const listed = await repo.listFutureActiveAppointments(now)

        expect(listed).toEqual([
            {
                id: "7",
                protocol: "PASSADO1",
                name: "Agendamento Passado",
                cpfMasked: "***.333.333-**",
                appointmentDatetime: new Date("2026-10-01T08:00:00-03:00"),
                requestDatetime: new Date("2026-09-20T10:00:00-03:00"),
                status: "PENDING",
                assignedUserId: null,
                offGrid: false,
            },
        ])
        expect(repo.listFutureCalls).toEqual([now])
    })

    describe("mudanças agendadas: devolve o resultado configurado e guarda os argumentos", () => {
        const now = new Date("2026-10-05T09:00:00-03:00")
        const changed = buildDefaultScheduleConfigView({ seatsPerSlot: 4 })
        const pastStart = {
            id: "11",
            protocol: "CONFLITO",
            name: "Agendamento na Vigência",
            cpfMasked: "***.444.444-**",
            appointmentDatetime: new Date("2026-10-13T08:00:00-03:00"),
            requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
            status: "CONFIRMED" as const,
        }

        it("salva a mudança resolvendo os conflitos e guarda os argumentos", async () => {
            const repo = createScheduleStubRepository({ appointments: [pastStart] })
            const config = normalizeAndValidateScheduleConfig({ ...changed, ranges: [] })

            const saved = await repo.saveScheduledConfig({
                config,
                actorUserId: 2,
                now,
                effectiveFrom: "2026-10-12",
                conflictResolution: "KEEP",
                seenConflictIds: ["11"],
            })

            expect(saved).toMatchObject({
                effectiveFrom: "2026-10-12",
                seatsPerSlot: 4,
                ranges: [],
                updatedBy: { id: 2, name: "Patrícia Lima" },
                updatedAt: now.toISOString(),
            })
            expect(repo.scheduledSaveCalls).toEqual([
                {
                    config,
                    actorUserId: 2,
                    now,
                    effectiveFrom: "2026-10-12",
                    conflictResolution: "KEEP",
                    seenConflictIds: ["11"],
                    validateAgainstVersions: undefined,
                },
            ])
        })

        it("lança o erro configurado ao salvar e ao cancelar, guardando os argumentos", async () => {
            const conflict = new ConflictError("Esta alteração afeta agendamentos futuros", "SCHEDULE_CONFLICTS", { conflicts: [] })
            const missing = new NotFoundError("Mudança de horário não encontrada")
            const repo = createScheduleStubRepository()
            repo.setScheduledSaveError(conflict)
            repo.setScheduledDeleteError(missing)
            const config = normalizeAndValidateScheduleConfig(changed)

            await expect(repo.saveScheduledConfig({ config, actorUserId: 2, now, effectiveFrom: "2026-10-12" })).rejects.toBe(conflict)
            await expect(repo.deleteScheduledConfig("2026-10-12", now)).rejects.toBe(missing)
            expect(repo.scheduledSaveCalls.map((call) => call.effectiveFrom)).toEqual(["2026-10-12"])
            expect(repo.scheduledDeleteCalls).toEqual([{ effectiveFrom: "2026-10-12", now }])
        })

        it("cancela sem conferir se a mudança existe e guarda os argumentos", async () => {
            const repo = createScheduleStubRepository()

            await repo.deleteScheduledConfig("2026-10-12", now)

            expect(repo.scheduledDeleteCalls).toEqual([{ effectiveFrom: "2026-10-12", now }])
        })

        it("devolve a configuração-base configurada para qualquer data, sem escolher entre as mudanças, e guarda a data", async () => {
            const base = buildDefaultScheduleConfigView()
            const repo = createScheduleStubRepository({
                config: base,
                scheduledConfigs: [{ effectiveFrom: "2026-10-01", config: changed }],
            })

            const version = await repo.getConfigForDate("2026-10-20")
            const current = await repo.getConfig()

            expect(version).toEqual({ effectiveFrom: null, config: base })
            expect(current).toEqual(base)
            expect(repo.configForDateCalls).toEqual(["2026-10-20"])
        })
    })
})

describe("scheduleStub.repository resolução de conflitos", () => {
    const now = new Date("2026-10-05T09:00:00-03:00")
    const saturdayAppointment = {
        id: "21",
        protocol: "SABADO01",
        name: "Agendamento de Sábado",
        cpfMasked: "***.555.555-**",
        appointmentDatetime: new Date("2026-10-17T10:00:00-03:00"),
        requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
        status: "CONFIRMED" as const,
    }
    const tuesdayAppointment = {
        id: "22",
        protocol: "TERCA001",
        name: "Agendamento de Terça",
        cpfMasked: "***.666.666-**",
        appointmentDatetime: new Date("2026-10-13T08:00:00-03:00"),
        requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
        status: "PENDING" as const,
    }
    const closedDay = normalizeAndValidateScheduleConfig({
        ...buildDefaultScheduleConfigView(),
        blockedDates: [
            { date: "2026-10-13", startTime: null, endTime: null, description: "Bloqueio total" },
        ],
    })
    const emptyRanges = normalizeAndValidateScheduleConfig({
        ...buildDefaultScheduleConfigView(),
        ranges: [],
    })
    const openConfig = normalizeAndValidateScheduleConfig(buildDefaultScheduleConfigView())

    async function conflictOf(action: () => Promise<unknown>): Promise<ConflictError> {
        try {
            await action()
        } catch (error) {
            return error as ConflictError
        }
        throw new Error("Era esperado um ConflictError")
    }

    describe("cancelar uma mudança agendada", () => {
        it("mantém os afetados fora da grade e devolve os ids resolvidos ao escolher Manter", async () => {
            const repo = createScheduleStubRepository({ appointments: [saturdayAppointment] })
            let outcome: { affectedIds: string[]; noticeEnabled: boolean } | undefined

            await repo.deleteScheduledConfig("2026-10-12", now, {
                actorUserId: 2,
                conflictResolution: "KEEP",
                seenConflictIds: ["21"],
                onResolved: (resolved) => {
                    outcome = resolved
                },
            })

            expect(outcome).toEqual({ affectedIds: ["21"], noticeEnabled: true })
            const [kept] = await repo.listFutureActiveAppointments(now)
            expect(kept?.offGrid).toBe(true)
        })

        it("remove os afetados e devolve os ids resolvidos ao escolher Cancelar", async () => {
            const repo = createScheduleStubRepository({ appointments: [saturdayAppointment] })
            let affectedIds: string[] = []

            await repo.deleteScheduledConfig("2026-10-12", now, {
                actorUserId: 2,
                conflictResolution: "CANCEL",
                seenConflictIds: ["21"],
                seenNoticeEnabled: true,
                onResolved: (resolved) => {
                    affectedIds = resolved.affectedIds
                },
            })

            expect(affectedIds).toEqual(["21"])
            expect(await repo.listFutureActiveAppointments(now)).toEqual([])
        })

        it("lança SCHEDULE_CONFLICTS com a lista e o estado do aviso quando não há resolução", async () => {
            const repo = createScheduleStubRepository({ appointments: [saturdayAppointment] })

            const error = await conflictOf(() => repo.deleteScheduledConfig("2026-10-12", now))

            expect(error.code).toBe("SCHEDULE_CONFLICTS")
            expect(error.details).toMatchObject({
                conflicts: [expect.objectContaining({ id: "21" })],
                cancellationNotice: { enabled: true, problem: null },
            })
        })

        it("lança SCHEDULE_CONFLICTS_CHANGED com a lista nova quando entrou um afetado que a equipe não viu", async () => {
            const repo = createScheduleStubRepository({
                appointments: [saturdayAppointment, { ...saturdayAppointment, id: "23", protocol: "SABADO02" }],
            })

            const error = await conflictOf(() =>
                repo.deleteScheduledConfig("2026-10-12", now, {
                    actorUserId: 2,
                    conflictResolution: "KEEP",
                    seenConflictIds: ["21"],
                }),
            )

            expect(error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
            expect(error.details).toMatchObject({
                conflicts: [expect.objectContaining({ id: "21" }), expect.objectContaining({ id: "23" })],
                cancellationNotice: { enabled: true, problem: null },
                changes: ["CONFLICTS"],
            })
            expect((await repo.listFutureActiveAppointments(now)).every((appointment) => !appointment.offGrid)).toBe(true)
        })
    })

    describe("salvar uma mudança agendada", () => {
        it("mantém os afetados fora da grade ao escolher Manter", async () => {
            const repo = createScheduleStubRepository({ appointments: [tuesdayAppointment] })
            let affectedIds: string[] = []

            await repo.saveScheduledConfig({
                config: emptyRanges,
                actorUserId: 2,
                now,
                effectiveFrom: "2026-10-12",
                conflictResolution: "KEEP",
                seenConflictIds: ["22"],
                onResolved: (resolved) => {
                    affectedIds = resolved.affectedIds
                },
            })

            expect(affectedIds).toEqual(["22"])
            const [kept] = await repo.listFutureActiveAppointments(now)
            expect(kept?.offGrid).toBe(true)
        })

        it("lança SCHEDULE_CONFLICTS sem resolução e SCHEDULE_CONFLICTS_CHANGED quando a lista vista é diferente", async () => {
            const repo = createScheduleStubRepository({ appointments: [tuesdayAppointment] })
            const params = { config: emptyRanges, actorUserId: 2, now, effectiveFrom: "2026-10-12" }

            const withoutResolution = await conflictOf(() => repo.saveScheduledConfig(params))
            const changed = await conflictOf(() =>
                repo.saveScheduledConfig({
                    ...params,
                    conflictResolution: "KEEP",
                    seenConflictIds: ["999"],
                }),
            )

            expect(withoutResolution.code).toBe("SCHEDULE_CONFLICTS")
            expect(changed.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
            expect(changed.details).toMatchObject({ changes: ["CONFLICTS"] })
        })
    })

    describe("salvar a configuração de hoje", () => {
        it("lança SCHEDULE_CONFLICTS_CHANGED quando um agendamento visto deixou de ser afetado e ainda há outro afetado", async () => {
            const repo = createScheduleStubRepository({
                appointments: [
                    { ...tuesdayAppointment, id: "31", appointmentDatetime: new Date("2026-10-13T08:00:00-03:00") },
                    { ...tuesdayAppointment, id: "32", appointmentDatetime: new Date("2026-10-13T08:30:00-03:00") },
                ],
            })

            const error = await conflictOf(() =>
                repo.saveConfig({
                    config: closedDay,
                    actorUserId: 2,
                    now,
                    conflictResolution: "CANCEL",
                    seenConflictIds: ["31", "32", "33"],
                    seenNoticeEnabled: true,
                }),
            )

            expect(error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
            expect(error.details).toMatchObject({
                conflicts: [expect.objectContaining({ id: "31" }), expect.objectContaining({ id: "32" })],
                changes: ["CONFLICTS"],
            })
        })

        it("lança SCHEDULE_CONFLICTS_CHANGED só pelo aviso quando o estado do aviso mudou ao cancelar", async () => {
            const repo = createScheduleStubRepository({ appointments: [tuesdayAppointment] })
            repo.setCancellationNoticeEnabled(false)

            const error = await conflictOf(() =>
                repo.saveConfig({
                    config: closedDay,
                    actorUserId: 2,
                    now,
                    conflictResolution: "CANCEL",
                    seenConflictIds: ["22"],
                    seenNoticeEnabled: true,
                }),
            )

            expect(error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
            expect(error.details).toMatchObject({
                cancellationNotice: { enabled: false, problem: null },
                changes: ["NOTICE"],
            })
            expect((await repo.getConfig())?.blockedDates).toEqual([])
        })

        it("não recusa Manter só porque o estado do aviso mudou", async () => {
            const repo = createScheduleStubRepository({ appointments: [tuesdayAppointment] })
            repo.setCancellationNoticeEnabled(false)
            let outcome: { affectedIds: string[]; noticeEnabled: boolean } | undefined

            await repo.saveConfig({
                config: closedDay,
                actorUserId: 2,
                now,
                conflictResolution: "KEEP",
                seenConflictIds: ["22"],
                onResolved: (resolved) => {
                    outcome = resolved
                },
            })

            expect(outcome).toEqual({ affectedIds: ["22"], noticeEnabled: false })
        })

        it("grava sem mexer em ninguém quando a lista refeita está vazia e a equipe tinha visto afetados", async () => {
            const repo = createScheduleStubRepository({ appointments: [] })
            let outcome: { affectedIds: string[]; noticeEnabled: boolean } | undefined

            await repo.saveConfig({
                config: openConfig,
                actorUserId: 2,
                now,
                conflictResolution: "CANCEL",
                seenConflictIds: ["22"],
                seenNoticeEnabled: false,
                onResolved: (resolved) => {
                    outcome = resolved
                },
            })

            expect(outcome).toEqual({ affectedIds: [], noticeEnabled: true })
        })
    })
})
