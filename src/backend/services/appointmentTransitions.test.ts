import { describe, expect, it } from "vitest"
import type { AppointmentActionType, AppointmentStatus } from "../types/appointment.types"
import { decideTransition } from "./appointmentTransitions"

const past = new Date("2026-10-19T09:00:00-03:00")
const future = new Date("2026-10-25T09:00:00-03:00")
const now = new Date("2026-10-20T12:00:00-03:00")

type StatusCase = {
    action: AppointmentActionType
    status: AppointmentStatus
    allowed: boolean
    code?: string
    message?: string
}

const statusCases: StatusCase[] = [
    { action: "claim", status: "PENDING", allowed: true },
    {
        action: "claim",
        status: "CONFIRMED",
        allowed: false,
        code: "APPOINTMENT_ALREADY_CLAIMED",
        message: "Apenas agendamentos pendentes podem ser assumidos",
    },
    {
        action: "claim",
        status: "ATTENDED",
        allowed: false,
        code: "ALREADY_ATTENDED",
        message: "Agendamento já foi atendido",
    },
    {
        action: "claim",
        status: "NO_SHOW",
        allowed: false,
        code: "ALREADY_NO_SHOW",
        message: "Agendamento já registrado como não compareceu",
    },
    {
        action: "claim",
        status: "CANCELED",
        allowed: false,
        code: "APPOINTMENT_CANCELED",
        message: "Não é possível assumir um agendamento cancelado",
    },
    { action: "attended", status: "PENDING", allowed: true },
    { action: "attended", status: "CONFIRMED", allowed: true },
    {
        action: "attended",
        status: "ATTENDED",
        allowed: false,
        code: "ALREADY_ATTENDED",
        message: "Agendamento já foi marcado como atendido",
    },
    {
        action: "attended",
        status: "NO_SHOW",
        allowed: false,
        code: "ALREADY_NO_SHOW",
        message: "Agendamento já foi registrado como não compareceu",
    },
    {
        action: "attended",
        status: "CANCELED",
        allowed: false,
        code: "APPOINTMENT_CANCELED",
        message: "Não é possível registrar atendimento para um agendamento cancelado",
    },
    { action: "no_show", status: "PENDING", allowed: true },
    { action: "no_show", status: "CONFIRMED", allowed: true },
    {
        action: "no_show",
        status: "ATTENDED",
        allowed: false,
        code: "ALREADY_ATTENDED",
        message: "Agendamento já foi marcado como atendido",
    },
    {
        action: "no_show",
        status: "NO_SHOW",
        allowed: false,
        code: "ALREADY_NO_SHOW",
        message: "Agendamento já foi registrado como não compareceu",
    },
    {
        action: "no_show",
        status: "CANCELED",
        allowed: false,
        code: "APPOINTMENT_CANCELED",
        message: "Não é possível registrar como não compareceu para um agendamento cancelado",
    },
]

describe("appointmentTransitions", () => {
    describe("decideTransition por status", () => {
        it.each(statusCases)(
            "decide a ação $action sobre o status $status",
            ({ action, status, allowed, code, message }) => {
                const appointmentDatetime = allowed ? past : future

                const decision = decideTransition(action, { status, appointmentDatetime }, now)

                expect(decision.allowed).toBe(allowed)
                if (!decision.allowed) {
                    expect(decision.error.statusCode).toBe(409)
                    expect(decision.error.code).toBe(code)
                    expect(decision.error.message).toBe(message)
                }
            },
        )
    })

    describe("decideTransition pela data do atendimento", () => {
        it("recusa marcar atendido antes do dia do atendimento", () => {
            const decision = decideTransition(
                "attended",
                { status: "CONFIRMED", appointmentDatetime: new Date("2026-10-21T09:00:00-03:00") },
                new Date("2026-10-20T18:00:00-03:00"),
            )

            expect(decision.allowed).toBe(false)
            if (!decision.allowed) {
                expect(decision.error.statusCode).toBe(409)
                expect(decision.error.code).toBe("ATTENDANCE_NOT_YET_AVAILABLE")
                expect(decision.error.message).toBe("Disponível a partir do dia do atendimento")
            }
        })

        it("permite marcar atendido no mesmo dia antes do horário", () => {
            const decision = decideTransition(
                "attended",
                { status: "PENDING", appointmentDatetime: new Date("2026-10-20T15:00:00-03:00") },
                new Date("2026-10-20T08:00:00-03:00"),
            )

            expect(decision).toEqual({ allowed: true })
        })

        it("recusa marcar não compareceu no mesmo dia antes do horário", () => {
            const decision = decideTransition(
                "no_show",
                { status: "CONFIRMED", appointmentDatetime: new Date("2026-10-20T15:00:00-03:00") },
                new Date("2026-10-20T14:59:00-03:00"),
            )

            expect(decision.allowed).toBe(false)
            if (!decision.allowed) {
                expect(decision.error.statusCode).toBe(409)
                expect(decision.error.code).toBe("NO_SHOW_NOT_YET_AVAILABLE")
                expect(decision.error.message).toBe("Disponível apenas após o horário do agendamento")
            }
        })

        it("permite marcar não compareceu depois do horário", () => {
            const decision = decideTransition(
                "no_show",
                { status: "PENDING", appointmentDatetime: new Date("2026-10-20T15:00:00-03:00") },
                new Date("2026-10-20T15:00:00-03:00"),
            )

            expect(decision).toEqual({ allowed: true })
        })

        it("às 23h30 em São Paulo recusa marcar atendido para o dia seguinte, mesmo no mesmo dia em UTC", () => {
            const decision = decideTransition(
                "attended",
                { status: "CONFIRMED", appointmentDatetime: new Date("2026-10-20T08:00:00-03:00") },
                new Date("2026-10-19T23:30:00-03:00"),
            )

            expect(decision.allowed).toBe(false)
            if (!decision.allowed) {
                expect(decision.error.statusCode).toBe(409)
                expect(decision.error.code).toBe("ATTENDANCE_NOT_YET_AVAILABLE")
            }
        })

        it("às 00h30 em São Paulo permite marcar atendido no próprio dia, mesmo com o horário em outro dia UTC", () => {
            const decision = decideTransition(
                "attended",
                { status: "CONFIRMED", appointmentDatetime: new Date("2026-10-20T21:30:00-03:00") },
                new Date("2026-10-20T00:30:00-03:00"),
            )

            expect(decision).toEqual({ allowed: true })
        })
    })
})
