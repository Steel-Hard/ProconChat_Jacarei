import { describe, expect, it } from "vitest"
import ConflictError from "../../errors/ConflictError"
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
})
