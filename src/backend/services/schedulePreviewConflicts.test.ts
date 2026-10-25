import { describe, expect, it } from "vitest"
import {
    buildDefaultScheduleConfigView,
    createScheduleStubRepository,
} from "../repositories/mock/scheduleStub.repository"
import { FutureActiveAppointment, ScheduleConfigView } from "../types/schedule.types"
import { buildFutureAppointment, buildScheduleConfigInput } from "./mock/scheduleConfig.builders"
import { createScheduleService } from "./schedule.service"

const FIXED_NOW = new Date("2026-10-05T09:00:00-03:00")
const CONFLICT_KEYS = ["code", "date", "protocol", "reason", "status", "time"]

function serviceWith(appointments: FutureActiveAppointment[], config?: ScheduleConfigView | null) {
    const repository = createScheduleStubRepository({ appointments, config })
    return { repository, service: createScheduleService(repository) }
}

describe("ScheduleService.getMonthlyPreview com conflitos", () => {
    it("aponta o agendamento cuja faixa o rascunho remove, só com protocolo, data, hora, status, código e motivo", async () => {
        const appointment = buildFutureAppointment({
            protocol: "A1B2C3D4",
            appointmentDatetime: new Date("2026-10-06T14:00:00-03:00"),
            status: "CONFIRMED",
            assignedUserId: 3,
        })
        const { service } = serviceWith([appointment])
        const draftConfig = buildScheduleConfigInput({
            ranges: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "08:00", endTime: "12:00" })),
        })

        const preview = await service.getMonthlyPreview({ month: "2026-10", draftConfig, now: FIXED_NOW })

        expect(preview.conflicts).toEqual([
            {
                protocol: "A1B2C3D4",
                date: "2026-10-06",
                time: "14:00",
                status: "CONFIRMED",
                code: "RANGE_CHANGED",
                reason: "Faixa de horário removida ou alterada",
            },
        ])
        expect(Object.keys(preview.conflicts[0]!).sort()).toEqual(CONFLICT_KEYS)
    })

    it("aponta o horário que deixa de existir com a duração nova do rascunho", async () => {
        const { service } = serviceWith([
            buildFutureAppointment({ protocol: "DURA0001", appointmentDatetime: new Date("2026-10-06T08:30:00-03:00") }),
        ])
        const draftConfig = buildScheduleConfigInput({ slotMinutes: 60 })

        const preview = await service.getMonthlyPreview({ month: "2026-10", draftConfig, now: FIXED_NOW })

        expect(preview.conflicts).toEqual([
            {
                protocol: "DURA0001",
                date: "2026-10-06",
                time: "08:30",
                status: "PENDING",
                code: "DURATION_CHANGED",
                reason: "Horário deixou de existir com atendimentos de 60 minutos",
            },
        ])
    })

    it("usa a duração salva como a atual ao apontar a sobreposição do responsável", async () => {
        const { service } = serviceWith([
            buildFutureAppointment({
                protocol: "GRADE001",
                appointmentDatetime: new Date("2026-10-06T09:00:00-03:00"),
                requestDatetime: new Date("2026-10-02T10:00:00-03:00"),
                status: "CONFIRMED",
                assignedUserId: 5,
            }),
            buildFutureAppointment({
                protocol: "ENCAIXE1",
                appointmentDatetime: new Date("2026-10-06T09:30:00-03:00"),
                requestDatetime: new Date("2026-10-01T10:00:00-03:00"),
                status: "CONFIRMED",
                assignedUserId: 5,
                offGrid: true,
            }),
        ])
        const draftConfig = buildScheduleConfigInput({ slotMinutes: 60 })

        const preview = await service.getMonthlyPreview({ month: "2026-10", draftConfig, now: FIXED_NOW })

        expect(preview.conflicts).toEqual([
            {
                protocol: "GRADE001",
                date: "2026-10-06",
                time: "09:00",
                status: "CONFIRMED",
                code: "RESPONSIBLE_OVERLAP",
                reason: "Responsável com outro agendamento sobreposto com atendimentos de 60 minutos (protocolo ENCAIXE1)",
            },
        ])
    })

    it("devolve a lista vazia quando o rascunho não afeta ninguém", async () => {
        const { service } = serviceWith([
            buildFutureAppointment({ appointmentDatetime: new Date("2026-10-06T09:00:00-03:00") }),
        ])

        const preview = await service.getMonthlyPreview({
            month: "2026-10",
            draftConfig: buildScheduleConfigInput({ seatsPerSlot: 3 }),
            now: FIXED_NOW,
        })

        expect(preview.conflicts).toEqual([])
    })

    it("traz o campo de conflitos também na prévia da configuração salva", async () => {
        const { service } = serviceWith([
            buildFutureAppointment({ appointmentDatetime: new Date("2026-10-06T09:00:00-03:00") }),
        ])

        const preview = await service.getMonthlyPreview({ month: "2026-10", now: FIXED_NOW })

        expect(preview.conflicts).toEqual([])
    })

    it("aponta na prévia salva o agendamento que a grade salva já não comporta", async () => {
        const { service } = serviceWith(
            [buildFutureAppointment({ protocol: "SABADO01", appointmentDatetime: new Date("2026-10-10T09:00:00-03:00") })],
            buildDefaultScheduleConfigView(),
        )

        const preview = await service.getMonthlyPreview({ month: "2026-10", now: FIXED_NOW })

        expect(preview.conflicts.map((conflict) => [conflict.protocol, conflict.code])).toEqual([
            ["SABADO01", "DAY_WITHOUT_SERVICE"],
        ])
    })

    it("simula o rascunho sem configuração salva, sem duração atual", async () => {
        const { service } = serviceWith(
            [buildFutureAppointment({ appointmentDatetime: new Date("2026-10-06T09:00:00-03:00") })],
            null,
        )

        const preview = await service.getMonthlyPreview({
            month: "2026-10",
            draftConfig: buildScheduleConfigInput(),
            now: FIXED_NOW,
        })

        expect(preview.conflicts).toEqual([])
    })

    it("lê os agendamentos futuros a partir do instante da prévia", async () => {
        const { repository, service } = serviceWith([])

        await service.getMonthlyPreview({ month: "2026-10", now: FIXED_NOW })

        expect(repository.listFutureCalls).toEqual([FIXED_NOW])
    })
})
