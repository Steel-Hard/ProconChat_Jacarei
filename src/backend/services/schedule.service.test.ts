import { beforeEach, describe, expect, it, vi } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import ConflictError from "../errors/ConflictError"
import ScheduleNotConfiguredError from "../errors/ScheduleNotConfiguredError"
import {
    buildDefaultScheduleConfigView,
    createScheduleStubRepository,
} from "../repositories/mock/scheduleStub.repository"
import { IScheduleRepository } from "../repositories/schedule.repository.interface"
import { createScheduleService, freeSlotStartsOfDay, IScheduleService } from "./schedule.service"
import {
    buildScheduleSettings,
    fullDayBlock,
    partialBlock,
    weekdayRanges,
} from "./mock/schedule.fixtures"

describe("ScheduleService", () => {
    const defaultSettings = buildScheduleSettings()

    const defaultRanges = weekdayRanges("08:00:00", "10:00:00")

    let repoMock: IScheduleRepository
    let service: IScheduleService

    beforeEach(() => {
        repoMock = {
            getSettings: vi.fn().mockResolvedValue(defaultSettings),
            getRanges: vi.fn().mockResolvedValue(defaultRanges),
            getBlockedDates: vi.fn().mockResolvedValue([]),
            getConfigForDate: vi.fn(),
            getScheduleVersions: vi.fn(async (fromDate: string, toDate: string) => {
                const settings = await repoMock.getSettings()
                if (!settings) {
                    return []
                }
                const [ranges, blockedDates] = await Promise.all([
                    repoMock.getRanges(),
                    repoMock.getBlockedDates(fromDate, toDate),
                ])
                return [{
                    effectiveFrom: null,
                    config: buildDefaultScheduleConfigView({
                        slotMinutes: settings.slot_minutes as 20 | 30 | 40 | 60,
                        seatsPerSlot: settings.seats_per_slot,
                        windowDays: settings.window_days,
                        minNoticeDays: settings.min_notice_days as 0 | 1 | 2 | 3 | 5,
                        waitAlertDays: settings.wait_alert_days,
                        unitAddress: settings.unit_address,
                        unitAddressComplement: settings.unit_address_complement,
                        reminderEnabled: settings.reminder_enabled,
                        reminderHours: settings.reminder_hours as 2 | 6 | 12 | 24 | 48,
                        ranges: ranges.map((range) => ({
                            weekday: range.weekday,
                            slotIndex: range.slot_index,
                            startTime: range.start_time.slice(0, 5),
                            endTime: range.end_time.slice(0, 5),
                        })),
                        blockedDates: blockedDates.map((block) => ({
                            date: block.date,
                            startTime: block.start_time?.slice(0, 5) ?? null,
                            endTime: block.end_time?.slice(0, 5) ?? null,
                            description: block.description,
                        })),
                    }),
                }]
            }),
            listScheduledConfigs: vi.fn().mockResolvedValue([]),
            countActiveAppointmentsPerSlot: vi.fn().mockResolvedValue(new Map()),
            bookAppointment: vi.fn(),
            getConfig: vi.fn().mockResolvedValue(buildDefaultScheduleConfigView()),
            saveConfig: vi.fn().mockResolvedValue(buildDefaultScheduleConfigView()),
            saveScheduledConfig: vi.fn(),
            deleteScheduledConfig: vi.fn(),
            listFutureActiveAppointments: vi.fn().mockResolvedValue([]),
        }
        service = createScheduleService(repoMock)
    })

    function distinctDates(slots: { dateStr: string }[]): string[] {
        return Array.from(new Set(slots.map((s) => s.dateStr)))
    }

    it("deve calcular horários livres respeitando a antecedência mínima de 1 dia útil", async () => {
        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots.length).toBeGreaterThan(0)
        expect(slots.some((s) => s.dateStr === "2026-10-05")).toBe(false)
        expect(slots[0]?.dateStr).toBe("2026-10-06")
        expect(slots[0]?.timeStr).toBe("08:00")
        expect(slots[0]?.formatted).toContain("Terça-feira, 06/10 às 08:00")
    })

    it("conta a antecedência de sexta para segunda pulando o fim de semana", async () => {
        const now = new Date("2026-10-09T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots[0]?.dateStr).toBe("2026-10-12")
        expect(slots.some((s) => s.dateStr === "2026-10-09")).toBe(false)
    })

    it("conta a antecedência em dias com atendimento, não em dias corridos, a partir de sexta", async () => {
        vi.mocked(repoMock.getSettings).mockResolvedValueOnce(buildScheduleSettings({ min_notice_days: 2 }))

        const now = new Date("2026-10-09T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots[0]?.dateStr).toBe("2026-10-13")
        expect(distinctDates(slots)).not.toContain("2026-10-12")
    })

    it("não conta dia bloqueado dentro do período de antecedência", async () => {
        vi.mocked(repoMock.getSettings).mockResolvedValueOnce(buildScheduleSettings({ min_notice_days: 2 }))
        const blocked = [fullDayBlock("2026-10-06")]
        vi.mocked(repoMock.getBlockedDates).mockResolvedValueOnce(blocked)

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots[0]?.dateStr).toBe("2026-10-08")
        expect(distinctDates(slots)).not.toContain("2026-10-06")
        expect(distinctDates(slots)).not.toContain("2026-10-07")
    })

    it("deve oferecer horários no mesmo dia se min_notice_days for 0 e horário for futuro", async () => {
        vi.mocked(repoMock.getSettings).mockResolvedValueOnce(buildScheduleSettings({ min_notice_days: 0 }))

        const now = new Date("2026-10-05T08:15:00-03:00")
        const slots = await service.getAvailableSlots(now)

        const todaySlots = slots.filter((s) => s.dateStr === "2026-10-05")
        expect(todaySlots.length).toBeGreaterThan(0)
        expect(todaySlots[0]?.timeStr).toBe("08:30")
    })

    it("deve ignorar dias inteiros bloqueados em BlockedDates", async () => {
        const blocked = [fullDayBlock("2026-10-06")]
        vi.mocked(repoMock.getBlockedDates).mockResolvedValueOnce(blocked)

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots.some((s) => s.dateStr === "2026-10-06")).toBe(false)
        expect(slots[0]?.dateStr).toBe("2026-10-07")
    })

    it("deve filtrar slots que colidem com bloqueios parciais", async () => {
        const blocked = [partialBlock("2026-10-06", "08:30:00", "09:30:00")]
        vi.mocked(repoMock.getBlockedDates).mockResolvedValueOnce(blocked)

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        const times = slots.filter((s) => s.dateStr === "2026-10-06").map((s) => s.timeStr)
        expect(times).toContain("08:00")
        expect(times).not.toContain("08:30")
        expect(times).not.toContain("09:00")
        expect(times).toContain("09:30")
    })

    it("deve excluir slots lotados e diminuir vagas restantes de slots parcialmente ocupados", async () => {
        const activeCounts = new Map<string, number>()
        activeCounts.set(new Date("2026-10-06T08:00:00-03:00").toISOString(), 2)
        activeCounts.set(new Date("2026-10-06T08:30:00-03:00").toISOString(), 1)
        vi.mocked(repoMock.countActiveAppointmentsPerSlot).mockResolvedValueOnce(activeCounts)

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        const tuesdaySlots = slots.filter((s) => s.dateStr === "2026-10-06")
        expect(tuesdaySlots.some((s) => s.timeStr === "08:00")).toBe(false)

        const slot0830 = tuesdaySlots.find((s) => s.timeStr === "08:30")
        expect(slot0830).toBeDefined()
        expect(slot0830?.remainingSeats).toBe(1)
    })

    it("deve retornar array vazio se ScheduleSettings não estiver configurado", async () => {
        vi.mocked(repoMock.getSettings).mockResolvedValueOnce(null)
        const slots = await service.getAvailableSlots()
        expect(slots).toEqual([])
    })

    it("devolve lista vazia quando a grade não tem nenhuma faixa", async () => {
        vi.mocked(repoMock.getRanges).mockResolvedValueOnce([])

        const slots = await service.getAvailableSlots(new Date("2026-10-05T09:00:00-03:00"))

        expect(slots).toEqual([])
    })

    it("deve respeitar estritamente o limite da janela de agendamento (window_days)", async () => {
        vi.mocked(repoMock.getSettings).mockResolvedValueOnce(
            buildScheduleSettings({ window_days: 2, min_notice_days: 1 }),
        )

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        const dates = distinctDates(slots)
        expect(dates).toContain("2026-10-06")
        expect(dates).toContain("2026-10-07")
        expect(dates).not.toContain("2026-10-08")
        expect(dates).not.toContain("2026-10-09")
    })

    it("não deve entrar em loop infinito se as faixas forem mais curtas que slot_minutes", async () => {
        const shortRanges = weekdayRanges("08:00:00", "08:20:00")
        vi.mocked(repoMock.getRanges).mockResolvedValueOnce(shortRanges)

        const now = new Date("2026-10-05T09:00:00-03:00")
        const slots = await service.getAvailableSlots(now)

        expect(slots).toEqual([])
    })

    it("usa a configuração vigente em cada data ao oferecer horários", async () => {
        const baseline = buildDefaultScheduleConfigView({
            windowDays: 10,
            minNoticeDays: 0,
            ranges: [{ weekday: 2, slotIndex: 1, startTime: "08:00", endTime: "10:00" }],
        })
        const scheduled = buildDefaultScheduleConfigView({
            windowDays: 10,
            minNoticeDays: 0,
            seatsPerSlot: 4,
            ranges: [{ weekday: 3, slotIndex: 1, startTime: "14:00", endTime: "16:00" }],
        })
        vi.mocked(repoMock.getScheduleVersions).mockResolvedValueOnce([
            { effectiveFrom: null, config: baseline },
            { effectiveFrom: "2026-10-07", config: scheduled },
        ])

        const slots = await service.getAvailableSlots(new Date("2026-10-05T07:00:00-03:00"))

        expect(slots.filter((slot) => slot.dateStr === "2026-10-06").map((slot) => slot.timeStr)).toEqual([
            "08:00", "08:30", "09:00", "09:30",
        ])
        expect(slots.filter((slot) => slot.dateStr === "2026-10-07").map((slot) => slot.timeStr)).toEqual([
            "14:00", "14:30", "15:00", "15:30",
        ])
        expect(slots.find((slot) => slot.dateStr === "2026-10-07")?.remainingSeats).toBe(4)
    })

    describe("getConfig, saveConfig e getMonthlyPreview", () => {
        it("lança ScheduleNotConfiguredError quando não há configuração salva", async () => {
            vi.mocked(repoMock.getConfig).mockResolvedValueOnce(null)
            await expect(service.getConfig()).rejects.toBeInstanceOf(
                ScheduleNotConfiguredError,
            )
        })

        it("mantém 100% de consistência entre getAvailableSlots (bot) e getMonthlyPreview (painel)", async () => {
            const stubRepo = createScheduleStubRepository({
                config: buildDefaultScheduleConfigView({
                    slotMinutes: 30,
                    seatsPerSlot: 2,
                    windowDays: 10,
                    minNoticeDays: 1,
                    ranges: [1, 2, 3, 4, 5].map((weekday) => ({
                        weekday,
                        slotIndex: 1,
                        startTime: "08:00",
                        endTime: "10:00",
                    })),
                    blockedDates: [
                        {
                            date: "2026-10-07",
                            startTime: null,
                            endTime: null,
                            description: "Feriado",
                        },
                        {
                            date: "2026-10-08",
                            startTime: "08:30",
                            endTime: "09:30",
                            description: "Reunião",
                        },
                    ],
                }),
                appointments: [
                    {
                        id: "1",
                        protocol: "AAAA1111",
                        name: "João Silva",
                        cpfMasked: "***.111.222-**",
                        appointmentDatetime: new Date("2026-10-06T08:00:00-03:00"),
                        requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
                        status: "PENDING",
                    },
                    {
                        id: "2",
                        protocol: "BBBB2222",
                        name: "Maria Souza",
                        cpfMasked: "***.333.444-**",
                        appointmentDatetime: new Date("2026-10-06T08:00:00-03:00"),
                        requestDatetime: new Date("2026-10-01T11:00:00-03:00"),
                        status: "CONFIRMED",
                    },
                    {
                        id: "3",
                        protocol: "CCCC3333",
                        name: "Carlos Lima",
                        cpfMasked: "***.555.666-**",
                        appointmentDatetime: new Date("2026-10-06T08:30:00-03:00"),
                        requestDatetime: new Date("2026-10-01T12:00:00-03:00"),
                        status: "PENDING",
                    },
                ],
            })

            const realService = createScheduleService(stubRepo)
            const now = new Date("2026-10-05T09:00:00-03:00")

            const botSlots = await realService.getAvailableSlots(now)
            const preview = await realService.getMonthlyPreview({
                month: "2026-10",
                now,
            })

            const totalSeatsOfferedByBot = botSlots.reduce(
                (acc, s) => acc + s.remainingSeats,
                0,
            )
            expect(preview.freeWindowSeats).toBe(totalSeatsOfferedByBot)

            const previewOfferedSlots = preview.days.flatMap((d) =>
                d.slots
                    .filter((s) => s.offered && s.freeSeats > 0)
                    .map((s) => ({
                        dateStr: d.date,
                        timeStr: s.time,
                        remainingSeats: s.freeSeats,
                    })),
            )
            expect(previewOfferedSlots).toEqual(
                botSlots.map((s) => ({
                    dateStr: s.dateStr,
                    timeStr: s.timeStr,
                    remainingSeats: s.remainingSeats,
                })),
            )
        })

        it("recusa salvar configuração que gera conflito com agendamentos futuros", async () => {
            const stubRepo = createScheduleStubRepository({
                appointments: [
                    {
                        id: "10",
                        protocol: "A1B2C3D4",
                        name: "Maria Oliveira",
                        cpfMasked: "***.456.789-**",
                        appointmentDatetime: new Date("2026-10-06T08:00:00-03:00"),
                        requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
                        status: "CONFIRMED",
                    },
                ],
            })
            const realService = createScheduleService(stubRepo)
            const current = await realService.getConfig()

            await expect(
                realService.saveConfig(
                    {
                        ...current,
                        blockedDates: [
                            {
                                date: "2026-10-06",
                                startTime: null,
                                endTime: null,
                                description: "Ponto facultativo",
                            },
                        ],
                    },
                    2,
                    new Date("2026-10-05T09:00:00-03:00"),
                ),
            ).rejects.toBeInstanceOf(ConflictError)
        })

        it("prévia mensal usa a configuração efetiva em cada dia", async () => {
            const baseline = buildDefaultScheduleConfigView({
                windowDays: 10,
                minNoticeDays: 0,
                ranges: [{ weekday: 2, slotIndex: 1, startTime: "08:00", endTime: "10:00" }],
            })
            const scheduled = buildDefaultScheduleConfigView({
                windowDays: 10,
                minNoticeDays: 0,
                ranges: [{ weekday: 3, slotIndex: 1, startTime: "14:00", endTime: "16:00" }],
            })
            const repository = createScheduleStubRepository({
                config: baseline,
                scheduledConfigs: [{ effectiveFrom: "2026-10-07", config: scheduled }],
            })
            const realService = createScheduleService(repository)

            const preview = await realService.getMonthlyPreview({
                month: "2026-10",
                now: new Date("2026-10-05T07:00:00-03:00"),
            })

            expect(preview.days.find((day) => day.date === "2026-10-06")?.slots.map((slot) => slot.time)).toEqual([
                "08:00", "08:30", "09:00", "09:30",
            ])
            expect(preview.days.find((day) => day.date === "2026-10-07")?.slots.map((slot) => slot.time)).toEqual([
                "14:00", "14:30", "15:00", "15:30",
            ])
        })

        it("ignora agendamento anterior à data de início ao validar mudança futura", async () => {
            const current = buildDefaultScheduleConfigView()
            const repository = createScheduleStubRepository({
                config: current,
                appointments: [{
                    id: "10",
                    protocol: "A1B2C3D4",
                    name: "Maria Oliveira",
                    cpfMasked: "***.456.789-**",
                    appointmentDatetime: new Date("2026-10-06T08:00:00-03:00"),
                    requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
                    status: "CONFIRMED",
                }],
            })
            const realService = createScheduleService(repository)

            await expect(realService.saveScheduledConfig(
                {
                    ...current,
                    ranges: [],
                },
                "2026-10-07",
                2,
                new Date("2026-10-05T09:00:00-03:00"),
            )).resolves.toMatchObject({ effectiveFrom: "2026-10-07" })
        })

        it("rejeita mês inválido em getMonthlyPreview", async () => {
            await expect(
                service.getMonthlyPreview({ month: "2026-13" }),
            ).rejects.toBeInstanceOf(BadRequestError)
        })
    })

    describe("freeSlotStartsOfDay", () => {
        it("gera os inícios da grade do dia em minutos e tira os horários com bloqueio", () => {
            expect(freeSlotStartsOfDay("2026-10-21", defaultRanges, [], 30)).toEqual([480, 510, 540, 570])
            expect(
                freeSlotStartsOfDay("2026-10-21", defaultRanges, [partialBlock("2026-10-21", "08:00:00", "09:00:00")], 30),
            ).toEqual([540, 570])
            expect(freeSlotStartsOfDay("2026-10-24", defaultRanges, [], 30)).toEqual([])
        })
    })
})
