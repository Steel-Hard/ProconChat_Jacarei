import { describe, expect, it } from "vitest"
import type { AppointmentActionType, AppointmentStatus, CorrectionHistoryEvent } from "../types/appointment.types"
import {
    availableActions,
    CancellationNoticeState,
    decideRetryCancellationNotice,
    decideTransition,
    restoredStateAfterCorrection,
} from "./appointmentTransitions"

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
    { action: "assign", status: "PENDING", allowed: true },
    { action: "assign", status: "CONFIRMED", allowed: true },
    {
        action: "assign",
        status: "ATTENDED",
        allowed: false,
        code: "ALREADY_ATTENDED",
        message: "Agendamento já foi atendido",
    },
    {
        action: "assign",
        status: "NO_SHOW",
        allowed: false,
        code: "ALREADY_NO_SHOW",
        message: "Agendamento já registrado como não compareceu",
    },
    {
        action: "assign",
        status: "CANCELED",
        allowed: false,
        code: "APPOINTMENT_CANCELED",
        message: "Não é possível atribuir um agendamento cancelado",
    },
    { action: "correct_record", status: "ATTENDED", allowed: true },
    { action: "correct_record", status: "NO_SHOW", allowed: true },
    {
        action: "correct_record",
        status: "PENDING",
        allowed: false,
        code: "RECORD_NOT_CORRECTABLE",
        message: "Só é possível corrigir um agendamento atendido ou não compareceu",
    },
    {
        action: "correct_record",
        status: "CONFIRMED",
        allowed: false,
        code: "RECORD_NOT_CORRECTABLE",
        message: "Só é possível corrigir um agendamento atendido ou não compareceu",
    },
    {
        action: "correct_record",
        status: "CANCELED",
        allowed: false,
        code: "RECORD_NOT_CORRECTABLE",
        message: "Só é possível corrigir um agendamento atendido ou não compareceu",
    },
]

const ALL_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELED"]
const PERMISSION_REQUIRED = { allowed: false, code: "PERMISSION_REQUIRED" }

function historyEvent(
    id: string,
    type: CorrectionHistoryEvent["type"],
    createdAt: string,
    data: Record<string, unknown> = {},
): CorrectionHistoryEvent {
    return { id, type, data, createdAt: new Date(createdAt) }
}

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

    describe("decideTransition para cancelar", () => {
        it("recusa cancelar no horário exato do atendimento com CANCEL_AFTER_START", () => {
            const decision = decideTransition("cancel", { status: "CONFIRMED", appointmentDatetime: now }, now)

            expect(decision.allowed).toBe(false)
            if (!decision.allowed) {
                expect(decision.error.statusCode).toBe(409)
                expect(decision.error.code).toBe("CANCEL_AFTER_START")
                expect(decision.error.message).toBe("Só é possível cancelar antes do horário do atendimento")
            }
        })

        it("recusa cancelar 1 ms depois do horário do atendimento com CANCEL_AFTER_START", () => {
            const decision = decideTransition(
                "cancel",
                { status: "PENDING", appointmentDatetime: new Date(now.getTime() - 1) },
                now,
            )

            expect(decision.allowed).toBe(false)
            if (!decision.allowed) {
                expect(decision.error.code).toBe("CANCEL_AFTER_START")
            }
        })

        it.each(["PENDING", "CONFIRMED"] as const)("permite cancelar %s 1 ms antes do horário do atendimento", (status) => {
            const decision = decideTransition(
                "cancel",
                { status, appointmentDatetime: new Date(now.getTime() + 1) },
                now,
            )

            expect(decision).toEqual({ allowed: true })
        })

        it.each([
            { status: "CANCELED", code: "APPOINTMENT_CANCELED", message: "Agendamento já está cancelado" },
            { status: "ATTENDED", code: "ALREADY_ATTENDED", message: "Agendamento já foi marcado como atendido" },
            { status: "NO_SHOW", code: "ALREADY_NO_SHOW", message: "Agendamento já foi registrado como não compareceu" },
        ] as const)("recusa cancelar um agendamento $status com $code", ({ status, code, message }) => {
            const decision = decideTransition("cancel", { status, appointmentDatetime: future }, now)

            expect(decision.allowed).toBe(false)
            if (!decision.allowed) {
                expect(decision.error.statusCode).toBe(409)
                expect(decision.error.code).toBe(code)
                expect(decision.error.message).toBe(message)
            }
        })
    })

    describe("decideRetryCancellationNotice", () => {
        const failedNotice: CancellationNoticeState = {
            status: "CANCELED",
            hasStaffCancellation: true,
            lastCancellationNotice: "FAILED",
            hasPhone: true,
            appointmentDatetime: future,
        }

        it.each([
            { label: "sem CANCELED_BY_STAFF", state: { ...failedNotice, hasStaffCancellation: false } },
            { label: "com status CONFIRMED", state: { ...failedNotice, status: "CONFIRMED" as const } },
        ])("recusa o reenvio $label com NOTIFICATION_NOT_RETRYABLE", ({ state }) => {
            const decision = decideRetryCancellationNotice(state, now)

            expect(decision.allowed).toBe(false)
            if (!decision.allowed) {
                expect(decision.error.statusCode).toBe(409)
                expect(decision.error.code).toBe("NOTIFICATION_NOT_RETRYABLE")
                expect(decision.error.message).toBe("Não há aviso de cancelamento com falha para reenviar")
            }
        })

        it("recusa o reenvio com NOTIFICATION_NOT_RETRYABLE quando o último aviso é NOTIFIED", () => {
            const decision = decideRetryCancellationNotice({ ...failedNotice, lastCancellationNotice: "NOTIFIED" }, now)

            expect(decision.allowed).toBe(false)
            if (!decision.allowed) {
                expect(decision.error.code).toBe("NOTIFICATION_NOT_RETRYABLE")
            }
        })

        it("permite o reenvio quando houve cancelamento pela equipe e nenhum evento de aviso foi gravado", () => {
            const decision = decideRetryCancellationNotice({ ...failedNotice, lastCancellationNotice: null }, now)

            expect(decision).toEqual({ allowed: true })
        })

        it("recusa o reenvio sem telefone com CITIZEN_PHONE_UNAVAILABLE", () => {
            const decision = decideRetryCancellationNotice({ ...failedNotice, hasPhone: false }, now)

            expect(decision.allowed).toBe(false)
            if (!decision.allowed) {
                expect(decision.error.statusCode).toBe(409)
                expect(decision.error.code).toBe("CITIZEN_PHONE_UNAVAILABLE")
                expect(decision.error.message).toBe("O agendamento não tem telefone para enviar o aviso")
            }
        })

        it.each([
            { label: "no horário exato", appointmentDatetime: now },
            { label: "1 ms depois do horário", appointmentDatetime: new Date(now.getTime() - 1) },
        ])("recusa o reenvio $label com NOTIFICATION_AFTER_START", ({ appointmentDatetime }) => {
            const decision = decideRetryCancellationNotice({ ...failedNotice, appointmentDatetime }, now)

            expect(decision.allowed).toBe(false)
            if (!decision.allowed) {
                expect(decision.error.statusCode).toBe(409)
                expect(decision.error.code).toBe("NOTIFICATION_AFTER_START")
                expect(decision.error.message).toBe("O horário do atendimento já passou e o aviso não serve mais")
            }
        })

        it("permite o reenvio quando o último aviso falhou, há telefone e o horário não passou", () => {
            const decision = decideRetryCancellationNotice(failedNotice, now)

            expect(decision).toEqual({ allowed: true })
        })
    })

    describe("availableActions por permissão", () => {
        it.each(ALL_STATUSES)(
            "sem appointments.manage, todas as ações de gerenciar saem com PERMISSION_REQUIRED no status %s",
            (status) => {
                const actions = availableActions({ status, appointmentDatetime: past }, now, { canManage: false })

                expect(actions).toEqual({
                    claim: PERMISSION_REQUIRED,
                    attended: PERMISSION_REQUIRED,
                    no_show: PERMISSION_REQUIRED,
                    assign: PERMISSION_REQUIRED,
                    correct_record: PERMISSION_REQUIRED,
                    add_note: PERMISSION_REQUIRED,
                    cancel: PERMISSION_REQUIRED,
                    retry_cancellation_notice: PERMISSION_REQUIRED,
                })
            },
        )

        it("com appointments.manage, um pendente passado segue só as regras de status", () => {
            const actions = availableActions({ status: "PENDING", appointmentDatetime: past }, now, { canManage: true })

            expect(actions).toEqual({
                claim: { allowed: true, code: null },
                attended: { allowed: true, code: null },
                no_show: { allowed: true, code: null },
                assign: { allowed: true, code: null },
                correct_record: { allowed: false, code: "RECORD_NOT_CORRECTABLE" },
                add_note: { allowed: true, code: null },
                cancel: { allowed: false, code: "CANCEL_AFTER_START" },
                retry_cancellation_notice: { allowed: false, code: "NOTIFICATION_NOT_RETRYABLE" },
            })
        })

        it("com appointments.manage, um atendido só permite corrigir o registro e escrever observação", () => {
            const actions = availableActions({ status: "ATTENDED", appointmentDatetime: past }, now, { canManage: true })

            expect(actions).toEqual({
                claim: { allowed: false, code: "ALREADY_ATTENDED" },
                attended: { allowed: false, code: "ALREADY_ATTENDED" },
                no_show: { allowed: false, code: "ALREADY_ATTENDED" },
                assign: { allowed: false, code: "ALREADY_ATTENDED" },
                correct_record: { allowed: true, code: null },
                add_note: { allowed: true, code: null },
                cancel: { allowed: false, code: "ALREADY_ATTENDED" },
                retry_cancellation_notice: { allowed: false, code: "NOTIFICATION_NOT_RETRYABLE" },
            })
        })

        it("com appointments.manage, um cancelado só permite escrever observação", () => {
            const actions = availableActions({ status: "CANCELED", appointmentDatetime: future }, now, { canManage: true })

            expect(actions).toEqual({
                claim: { allowed: false, code: "APPOINTMENT_CANCELED" },
                attended: { allowed: false, code: "APPOINTMENT_CANCELED" },
                no_show: { allowed: false, code: "APPOINTMENT_CANCELED" },
                assign: { allowed: false, code: "APPOINTMENT_CANCELED" },
                correct_record: { allowed: false, code: "RECORD_NOT_CORRECTABLE" },
                add_note: { allowed: true, code: null },
                cancel: { allowed: false, code: "APPOINTMENT_CANCELED" },
                retry_cancellation_notice: { allowed: false, code: "NOTIFICATION_NOT_RETRYABLE" },
            })
        })

        it("com appointments.manage, um confirmado futuro permite atribuir e não permite corrigir", () => {
            const actions = availableActions({ status: "CONFIRMED", appointmentDatetime: future }, now, { canManage: true })

            expect(actions.assign).toEqual({ allowed: true, code: null })
            expect(actions.correct_record).toEqual({ allowed: false, code: "RECORD_NOT_CORRECTABLE" })
            expect(actions.claim).toEqual({ allowed: false, code: "APPOINTMENT_ALREADY_CLAIMED" })
        })

        it.each([
            { status: "PENDING", appointmentDatetime: future, expected: { allowed: true, code: null } },
            { status: "CONFIRMED", appointmentDatetime: future, expected: { allowed: true, code: null } },
            { status: "CONFIRMED", appointmentDatetime: now, expected: { allowed: false, code: "CANCEL_AFTER_START" } },
            { status: "NO_SHOW", appointmentDatetime: past, expected: { allowed: false, code: "ALREADY_NO_SHOW" } },
        ] as const)(
            "com appointments.manage, cancel de um $status segue a decisão de cancelar",
            ({ status, appointmentDatetime, expected }) => {
                const actions = availableActions({ status, appointmentDatetime }, now, { canManage: true })

                expect(actions.cancel).toEqual(expected)
            },
        )

        it.each([
            { lastCancellationNotice: "FAILED", hasPhone: true, expected: { allowed: true, code: null } },
            { lastCancellationNotice: "FAILED", hasPhone: false, expected: { allowed: false, code: "CITIZEN_PHONE_UNAVAILABLE" } },
            { lastCancellationNotice: "NOTIFIED", hasPhone: true, expected: { allowed: false, code: "NOTIFICATION_NOT_RETRYABLE" } },
        ] as const)(
            "com appointments.manage, retry_cancellation_notice com último aviso $lastCancellationNotice e telefone $hasPhone segue a decisão do reenvio",
            ({ lastCancellationNotice, hasPhone, expected }) => {
                const actions = availableActions({ status: "CANCELED", appointmentDatetime: future }, now, { canManage: true }, {
                    hasStaffCancellation: true,
                    lastCancellationNotice,
                    hasPhone,
                })

                expect(actions.retry_cancellation_notice).toEqual(expected)
            },
        )
    })

    describe("restoredStateAfterCorrection", () => {
        it("volta a pendente sem responsável quando o terminal veio junto de um auto-claim no mesmo instante", () => {
            const events = [
                historyEvent("1", "CREATED", "2026-10-19T10:00:00.000Z"),
                historyEvent("2", "CLAIMED", "2026-10-20T15:00:00.000Z", { auto_claimed: true }),
                historyEvent("3", "ATTENDED", "2026-10-20T15:00:00.000Z"),
            ]

            expect(restoredStateAfterCorrection(events, { assignedUserId: 7 })).toEqual({
                status: "PENDING",
                assignedUserId: null,
            })
        })

        it("volta a confirmado com o responsável atual quando já estava confirmado antes do registro", () => {
            const events = [
                historyEvent("1", "CREATED", "2026-10-19T10:00:00.000Z"),
                historyEvent("2", "CLAIMED", "2026-10-19T11:00:00.000Z"),
                historyEvent("3", "NO_SHOW", "2026-10-20T15:00:00.000Z"),
            ]

            expect(restoredStateAfterCorrection(events, { assignedUserId: 7 })).toEqual({
                status: "CONFIRMED",
                assignedUserId: 7,
            })
        })

        it("não volta a pendente quando o auto-claim antigo foi seguido de correção e de nova marcação sem auto-claim", () => {
            const events = [
                historyEvent("1", "CREATED", "2026-10-19T10:00:00.000Z"),
                historyEvent("2", "CLAIMED", "2026-10-20T15:00:00.000Z", { auto_claimed: true }),
                historyEvent("3", "ATTENDED", "2026-10-20T15:00:00.000Z"),
                historyEvent("4", "RECORD_CORRECTED", "2026-10-20T16:00:00.000Z"),
                historyEvent("5", "ASSIGNED", "2026-10-20T16:30:00.000Z", { assignee_user_id: 7 }),
                historyEvent("6", "NO_SHOW", "2026-10-20T17:00:00.000Z"),
            ]

            expect(restoredStateAfterCorrection(events, { assignedUserId: 7 })).toEqual({
                status: "CONFIRMED",
                assignedUserId: 7,
            })
        })

        it("usa o terminal mais recente quando uma correção anterior voltou a pendente e houve novo auto-claim", () => {
            const events = [
                historyEvent("1", "CLAIMED", "2026-10-20T10:00:00.000Z"),
                historyEvent("2", "ATTENDED", "2026-10-20T11:00:00.000Z"),
                historyEvent("3", "RECORD_CORRECTED", "2026-10-20T12:00:00.000Z"),
                historyEvent("4", "CLAIMED", "2026-10-20T13:00:00.000Z", { auto_claimed: true }),
                historyEvent("5", "NO_SHOW", "2026-10-20T13:00:00.000Z"),
            ]

            expect(restoredStateAfterCorrection(events, { assignedUserId: 9 })).toEqual({
                status: "PENDING",
                assignedUserId: null,
            })
        })

        it("reconhece o par do mesmo instante mesmo com os eventos fora da ordem de inserção", () => {
            const events = [
                historyEvent("9", "ATTENDED", "2026-10-20T15:00:00.000Z"),
                historyEvent("1", "CREATED", "2026-10-19T10:00:00.000Z"),
                historyEvent("10", "CLAIMED", "2026-10-20T15:00:00.000Z", { auto_claimed: true }),
            ]

            expect(restoredStateAfterCorrection(events, { assignedUserId: 7 })).toEqual({
                status: "PENDING",
                assignedUserId: null,
            })
        })

        it("não trata como auto-claim um CLAIMED do mesmo instante sem auto_claimed", () => {
            const events = [
                historyEvent("1", "CLAIMED", "2026-10-20T15:00:00.000Z"),
                historyEvent("2", "ATTENDED", "2026-10-20T15:00:00.000Z"),
            ]

            expect(restoredStateAfterCorrection(events, { assignedUserId: 7 })).toEqual({
                status: "CONFIRMED",
                assignedUserId: 7,
            })
        })
    })
})
