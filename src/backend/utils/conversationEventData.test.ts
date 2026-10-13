import { describe, expect, expectTypeOf, it } from "vitest"
import InternalServerError from "../errors/InternalServerError"
import type {
    ConversationEvent,
    FinishedOutcome,
    SessionClosing,
} from "../types/conversationEvent.types"
import {
    buildConversationEventRow,
    isClosingCompatible,
    parseConversationEventRow,
} from "./conversationEventData"

const sentinel = "Meu nome é Maria Fictícia e meu CPF é 000.000.000-00"

describe("buildConversationEventRow", () => {
    it.each([
        [{ type: "STARTED" }, null, null, null, {}],
        [{ type: "CATEGORY_CHOSEN", categoryId: 3 }, 3, null, null, {}],
        [{ type: "QUESTION_CHOSEN", categoryId: 3, questionId: 7 }, 3, 7, null, {}],
        [
            { type: "ANSWER_SENT", categoryId: 3, questionId: 7, llm: "NOT_CALLED" },
            3,
            7,
            null,
            { llm: "NOT_CALLED" },
        ],
        [
            { type: "ANSWER_SENT", categoryId: 3, questionId: 7, llm: "USED" },
            3,
            7,
            null,
            { llm: "USED" },
        ],
        [
            { type: "ANSWER_SENT", categoryId: 3, questionId: 7, llm: "FAILED" },
            3,
            7,
            null,
            { llm: "FAILED" },
        ],
        [{ type: "RESOLVED_ANSWERED", resolved: true }, null, null, null, { resolved: true }],
        [{ type: "RESOLVED_ANSWERED", resolved: false }, null, null, null, { resolved: false }],
        [
            { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" },
            null,
            null,
            null,
            { reason: "REQUIRES_IN_PERSON" },
        ],
        [
            { type: "SCHEDULE_OFFERED", reason: "NOT_RESOLVED" },
            null,
            null,
            null,
            { reason: "NOT_RESOLVED" },
        ],
        [{ type: "NO_SLOT" }, null, null, null, {}],
        [{ type: "SCHEDULE_DECLINED" }, null, null, null, {}],
        [
            { type: "ATTENDEE_CHOSEN", byRepresentative: true },
            null,
            null,
            null,
            { by_representative: true },
        ],
        [
            { type: "ATTENDEE_CHOSEN", byRepresentative: false },
            null,
            null,
            null,
            { by_representative: false },
        ],
        [{ type: "PHONE_NOTICE_SHOWN" }, null, null, null, {}],
        [{ type: "APPOINTMENT_CREATED", appointmentId: 9 }, null, null, 9, {}],
        [{ type: "APPOINTMENT_CONSULTED", appointmentId: 9 }, null, null, 9, {}],
        [
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 9,
                from: "2030-01-01T12:00:00Z",
                to: "2030-01-02T09:30:00.000-03:00",
            },
            null,
            null,
            9,
            { from: "2030-01-01T12:00:00Z", to: "2030-01-02T09:30:00.000-03:00" },
        ],
        [{ type: "APPOINTMENT_CANCELED", appointmentId: 9 }, null, null, 9, {}],
        [
            { type: "ABANDONED", step: "AWAITING_QUESTION" },
            null,
            null,
            null,
            { step: "AWAITING_QUESTION" },
        ],
    ])(
        "monta as colunas e o data do evento %o",
        (event, categoryId, questionId, appointmentId, data) => {
            const row = buildConversationEventRow("42", event)

            expect(row).toEqual({
                sessionId: "42",
                type: event.type,
                categoryId,
                questionId,
                appointmentId,
                data,
            })
        },
    )

    it.each([
        ["tipo desconhecido", { type: "FREE_TEXT" }],
        ["evento que não é objeto", "STARTED"],
        ["evento nulo", null],
        ["chave extra", { type: "STARTED", text: "oi" }],
        ["campo obrigatório ausente", { type: "CATEGORY_CHOSEN" }],
        ["id zero", { type: "CATEGORY_CHOSEN", categoryId: 0 }],
        ["id negativo", { type: "CATEGORY_CHOSEN", categoryId: -1 }],
        ["id fracionário", { type: "CATEGORY_CHOSEN", categoryId: 1.5 }],
        ["id em string", { type: "CATEGORY_CHOSEN", categoryId: "1" }],
        ["id acima do inteiro seguro", { type: "APPOINTMENT_CREATED", appointmentId: 2 ** 53 }],
        [
            "llm fora da lista",
            { type: "ANSWER_SENT", categoryId: 1, questionId: 2, llm: "MAYBE" },
        ],
        ["reason fora da lista", { type: "SCHEDULE_OFFERED", reason: "OTHER" }],
        ["step fora da lista", { type: "ABANDONED", step: "SOMEWHERE" }],
        ["step FINISHED", { type: "ABANDONED", step: "FINISHED" }],
        ["booleano em string", { type: "ATTENDEE_CHOSEN", byRepresentative: "true" }],
        ["resolved em string", { type: "RESOLVED_ANSWERED", resolved: "false" }],
        [
            "data sem fuso",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00",
                to: "2030-01-02T12:00:00Z",
            },
        ],
        [
            "data inválida",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00Z",
                to: "2030-13-45T99:00:00Z",
            },
        ],
        [
            "dia 31 de fevereiro",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00Z",
                to: "2026-02-31T12:00:00Z",
            },
        ],
        [
            "29 de fevereiro em ano não bissexto",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00Z",
                to: "2026-02-29T12:00:00Z",
            },
        ],
        [
            "dia 31 de abril",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00Z",
                to: "2030-04-31T12:00:00-03:00",
            },
        ],
        [
            "mês zero",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00Z",
                to: "2030-00-10T12:00:00Z",
            },
        ],
        [
            "dia zero",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00Z",
                to: "2030-01-00T12:00:00Z",
            },
        ],
        [
            "hora 24:00",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00Z",
                to: "2030-01-02T24:00:00Z",
            },
        ],
        [
            "minuto 60",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00Z",
                to: "2030-01-02T12:60:00Z",
            },
        ],
        [
            "segundo 60",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00Z",
                to: "2030-01-02T12:00:60Z",
            },
        ],
        [
            "data em número",
            {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: 1893499200000,
                to: "2030-01-02T12:00:00Z",
            },
        ],
    ])("rejeita %s sem gravar nada", (_label, event) => {
        expect(() => buildConversationEventRow("42", event)).toThrow(InternalServerError)
    })

    it.each([
        ["2028-02-29T12:00:00Z"],
        ["2030-12-31T23:59:59.999Z"],
        ["2030-01-01T00:00-03:00"],
        ["2030-04-30T23:59:59+05:30"],
    ])("aceita a data limite válida %s", (to) => {
        const row = buildConversationEventRow("42", {
            type: "APPOINTMENT_RESCHEDULED",
            appointmentId: 1,
            from: "2030-01-01T12:00:00Z",
            to,
        })

        expect(row.data).toEqual({ from: "2030-01-01T12:00:00Z", to })
    })

    it.each([["abc"], [""], ["1a"], [42], [null]])(
        "rejeita o id de sessão %o",
        (sessionId) => {
            expect(() => buildConversationEventRow(sessionId, { type: "STARTED" })).toThrow(
                InternalServerError,
            )
        },
    )

    it.each([
        { type: sentinel },
        { type: "STARTED", [sentinel]: true },
        { type: "STARTED", note: sentinel },
        { type: "SCHEDULE_OFFERED", reason: sentinel },
        { type: "ABANDONED", step: sentinel },
        { type: "APPOINTMENT_RESCHEDULED", appointmentId: 1, from: sentinel, to: sentinel },
    ])("não repete o texto recebido na mensagem de erro (%#)", (event) => {
        let message = ""

        try {
            buildConversationEventRow(sentinel, event)
        } catch (error) {
            message = error instanceof Error ? error.message : ""
        }

        expect(message).not.toBe("")
        expect(message).not.toContain(sentinel)
        expect(message).not.toContain("Maria")
    })
})

describe("parseConversationEventRow", () => {
    const createdAt = new Date("2030-01-01T12:00:00Z")

    it("devolve o evento em camelCase com createdAt", () => {
        const event = parseConversationEventRow({
            type: "ANSWER_SENT",
            category_id: "3",
            question_id: "7",
            appointment_id: null,
            data: { llm: "USED" },
            created_at: createdAt,
        })

        expect(event).toEqual({
            type: "ANSWER_SENT",
            categoryId: 3,
            questionId: 7,
            llm: "USED",
            createdAt,
        })
    })

    it("converte by_representative e from/to de volta para o tipo", () => {
        const attendee = parseConversationEventRow({
            type: "ATTENDEE_CHOSEN",
            category_id: null,
            question_id: null,
            appointment_id: null,
            data: { by_representative: true },
            created_at: createdAt,
        })
        const rescheduled = parseConversationEventRow({
            type: "APPOINTMENT_RESCHEDULED",
            category_id: null,
            question_id: null,
            appointment_id: "9",
            data: { from: "2030-01-01T12:00:00Z", to: "2030-01-02T12:00:00Z" },
            created_at: createdAt,
        })

        expect(attendee).toEqual({ type: "ATTENDEE_CHOSEN", byRepresentative: true, createdAt })
        expect(rescheduled).toEqual({
            type: "APPOINTMENT_RESCHEDULED",
            appointmentId: 9,
            from: "2030-01-01T12:00:00Z",
            to: "2030-01-02T12:00:00Z",
            createdAt,
        })
    })

    it("descarta chave desconhecida vinda do banco", () => {
        const event = parseConversationEventRow({
            type: "STARTED",
            category_id: null,
            question_id: null,
            appointment_id: null,
            data: { text: sentinel },
            created_at: createdAt,
        })

        expect(event).toEqual({ type: "STARTED", createdAt })
        expect(JSON.stringify(event)).not.toContain(sentinel)
    })

    it("rejeita linha com valor fora do contrato", () => {
        expect(() =>
            parseConversationEventRow({
                type: "SCHEDULE_OFFERED",
                category_id: null,
                question_id: null,
                appointment_id: null,
                data: { reason: sentinel },
                created_at: createdAt,
            }),
        ).toThrow(InternalServerError)
    })
})

describe("isClosingCompatible", () => {
    const answerSent: ConversationEvent = {
        type: "ANSWER_SENT",
        categoryId: 1,
        questionId: 2,
        llm: "NOT_CALLED",
    }

    it.each<SessionClosing>([
        { outcome: "RESOLVED", event: { type: "RESOLVED_ANSWERED", resolved: true } },
        { outcome: "RESOLVED", event: answerSent },
        { outcome: "SCHEDULED", event: { type: "APPOINTMENT_CREATED", appointmentId: 1 } },
        { outcome: "OUT_OF_SCOPE", event: answerSent },
        { outcome: "NO_SLOT", event: { type: "NO_SLOT" } },
        { outcome: "DECLINED", event: { type: "SCHEDULE_DECLINED" } },
        {
            outcome: "MANAGED_APPOINTMENT",
            event: {
                type: "APPOINTMENT_RESCHEDULED",
                appointmentId: 1,
                from: "2030-01-01T12:00:00Z",
                to: "2030-01-02T12:00:00Z",
            },
        },
        {
            outcome: "MANAGED_APPOINTMENT",
            event: { type: "APPOINTMENT_CANCELED", appointmentId: 1 },
        },
    ])("aceita o fechamento $outcome com $event.type", (closing) => {
        expect(isClosingCompatible(closing)).toBe(true)
    })

    it.each<SessionClosing>([
        { outcome: "RESOLVED", event: { type: "RESOLVED_ANSWERED", resolved: false } },
        { outcome: "RESOLVED", event: { type: "STARTED" } },
        { outcome: "SCHEDULED", event: answerSent },
        { outcome: "OUT_OF_SCOPE", event: { type: "RESOLVED_ANSWERED", resolved: true } },
        { outcome: "NO_SLOT", event: { type: "SCHEDULE_DECLINED" } },
        { outcome: "DECLINED", event: { type: "NO_SLOT" } },
        {
            outcome: "MANAGED_APPOINTMENT",
            event: { type: "APPOINTMENT_CONSULTED", appointmentId: 1 },
        },
    ])("recusa o fechamento $outcome com $event.type", (closing) => {
        expect(isClosingCompatible(closing)).toBe(false)
    })

    it("não aceita ABANDONED nem IN_PROGRESS como desfecho de encerramento", () => {
        expectTypeOf<"ABANDONED">().not.toMatchTypeOf<FinishedOutcome>()
        expectTypeOf<"IN_PROGRESS">().not.toMatchTypeOf<FinishedOutcome>()

        const abandoned = { outcome: "ABANDONED", event: { type: "ABANDONED", step: "AWAITING_CATEGORY" } }
        const inProgress = { outcome: "IN_PROGRESS", event: answerSent }

        expect(isClosingCompatible(abandoned as unknown as SessionClosing)).toBe(false)
        expect(isClosingCompatible(inProgress as unknown as SessionClosing)).toBe(false)
    })
})
