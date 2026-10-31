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

        it("salva a mudança sem conferir conflitos e guarda os argumentos", async () => {
            const repo = createScheduleStubRepository({ appointments: [pastStart] })
            const config = normalizeAndValidateScheduleConfig({ ...changed, ranges: [] })

            const saved = await repo.saveScheduledConfig({ config, actorUserId: 2, now, effectiveFrom: "2026-10-12" })

            expect(saved).toMatchObject({
                effectiveFrom: "2026-10-12",
                seatsPerSlot: 4,
                ranges: [],
                updatedBy: { id: 2, name: "Patrícia Lima" },
                updatedAt: now.toISOString(),
            })
            expect(repo.scheduledSaveCalls).toEqual([
                { config, actorUserId: 2, now, effectiveFrom: "2026-10-12", validateAgainstVersions: undefined },
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
