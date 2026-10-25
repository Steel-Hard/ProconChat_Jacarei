import { describe, expect, it } from "vitest"
import { createScheduleStubRepository } from "../repositories/mock/scheduleStub.repository"
import { buildFutureAppointment } from "./mock/scheduleConfig.builders"
import { createScheduleService } from "./schedule.service"

const FIXED_NOW = new Date("2026-10-05T09:00:00-03:00")

function serviceWith(appointments: ReturnType<typeof buildFutureAppointment>[]) {
    const repository = createScheduleStubRepository({ appointments })
    return { repository, service: createScheduleService(repository) }
}

describe("ScheduleService.getBookedDays", () => {
    it("agrupa por data e hora de São Paulo, conta o mesmo horário e soma o total do dia", async () => {
        const { service } = serviceWith([
            buildFutureAppointment({ appointmentDatetime: new Date("2026-10-07T09:00:00-03:00") }),
            buildFutureAppointment({ appointmentDatetime: new Date("2026-10-06T10:00:00-03:00"), status: "CONFIRMED", assignedUserId: 3 }),
            buildFutureAppointment({ appointmentDatetime: new Date("2026-10-07T09:00:00-03:00") }),
            buildFutureAppointment({ appointmentDatetime: new Date("2026-10-07T08:30:00-03:00") }),
        ])

        const result = await service.getBookedDays(FIXED_NOW)

        expect(result).toEqual({
            days: [
                { date: "2026-10-06", weekday: 2, total: 1, times: [{ time: "10:00", count: 1 }] },
                {
                    date: "2026-10-07",
                    weekday: 3,
                    total: 3,
                    times: [
                        { time: "08:30", count: 1 },
                        { time: "09:00", count: 2 },
                    ],
                },
            ],
        })
    })

    it("ignora os agendamentos fora da grade", async () => {
        const { service } = serviceWith([
            buildFutureAppointment({ appointmentDatetime: new Date("2026-10-08T09:00:00-03:00"), offGrid: true }),
            buildFutureAppointment({ appointmentDatetime: new Date("2026-10-09T09:00:00-03:00") }),
        ])

        const result = await service.getBookedDays(FIXED_NOW)

        expect(result.days.map((day) => day.date)).toEqual(["2026-10-09"])
    })

    it("põe o agendamento das 23:30 de São Paulo na data local, e não na data UTC", async () => {
        const { service } = serviceWith([
            buildFutureAppointment({ appointmentDatetime: new Date("2026-10-08T02:30:00Z") }),
        ])

        const result = await service.getBookedDays(FIXED_NOW)

        expect(result.days).toEqual([
            { date: "2026-10-07", weekday: 3, total: 1, times: [{ time: "23:30", count: 1 }] },
        ])
    })

    it("devolve a lista vazia quando não há agendamento futuro", async () => {
        const { service } = serviceWith([])

        const result = await service.getBookedDays(FIXED_NOW)

        expect(result).toEqual({ days: [] })
    })

    it("pede ao repositório os agendamentos futuros a partir do instante recebido", async () => {
        const { repository, service } = serviceWith([])

        await service.getBookedDays(FIXED_NOW)

        expect(repository.listFutureCalls).toEqual([FIXED_NOW])
    })

    it("não expõe id, protocolo, nome, CPF nem responsável", async () => {
        const { service } = serviceWith([
            buildFutureAppointment({
                appointmentDatetime: new Date("2026-10-06T10:00:00-03:00"),
                status: "CONFIRMED",
                assignedUserId: 4,
            }),
        ])

        const result = await service.getBookedDays(FIXED_NOW)

        const day = result.days[0]!
        expect(Object.keys(day).sort()).toEqual(["date", "times", "total", "weekday"])
        expect(Object.keys(day.times[0]!).sort()).toEqual(["count", "time"])
    })
})
