import { beforeEach, describe, expect, it, vi } from "vitest"
import InternalServerError from "../errors/InternalServerError"

const { query } = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock("../db/connection", () => ({
    default: () => ({ query }),
}))

import {
    conversationEventRepository,
    createConversationEventRepository,
    insertConversationEvent,
} from "./conversationEvent.repository"

describe("conversationEventRepository", () => {
    beforeEach(() => {
        query.mockReset()
        query.mockResolvedValue({ rows: [], rowCount: 1 })
    })

    it("persists only typed answer metadata and distinguishes LLM failure", async () => {
        await conversationEventRepository.record("1", {
            type: "ANSWER_SENT",
            categoryId: 10,
            questionId: 20,
            llm: "FAILED",
        })

        const [sql, values] = query.mock.calls[0] as [string, unknown[]]
        expect(sql).toContain("category_id, question_id, appointment_id, data")
        expect(sql).not.toContain("text")
        expect(values).toEqual([
            "1",
            "ANSWER_SENT",
            10,
            20,
            null,
            JSON.stringify({ llm: "FAILED" }),
        ])
    })

    it("stores a response without calling the LLM as NOT_CALLED", async () => {
        await conversationEventRepository.record("1", {
            type: "ANSWER_SENT",
            categoryId: 10,
            questionId: 20,
            llm: "NOT_CALLED",
        })

        expect(query.mock.calls[0]?.[1]?.[5]).toBe(JSON.stringify({ llm: "NOT_CALLED" }))
    })

    it("grava by_representative no data de quem comparece", async () => {
        await conversationEventRepository.record("1", {
            type: "ATTENDEE_CHOSEN",
            byRepresentative: true,
        })

        expect(query.mock.calls[0]?.[1]).toEqual([
            "1",
            "ATTENDEE_CHOSEN",
            null,
            null,
            null,
            JSON.stringify({ by_representative: true }),
        ])
    })

    it("recusa evento inválido sem executar consulta", async () => {
        const invalid = { type: "STARTED", text: "Meu nome é Maria Fictícia" }

        await expect(
            conversationEventRepository.record("1", invalid as never),
        ).rejects.toBeInstanceOf(InternalServerError)
        expect(query).not.toHaveBeenCalled()
    })

    it("insertConversationEvent usa o db recebido em vez do pool", async () => {
        const client = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) }

        await insertConversationEvent(client as never, "7", {
            type: "APPOINTMENT_CREATED",
            appointmentId: 3,
        })

        expect(query).not.toHaveBeenCalled()
        expect(client.query).toHaveBeenCalledOnce()
        expect(client.query.mock.calls[0]?.[1]).toEqual([
            "7",
            "APPOINTMENT_CREATED",
            null,
            null,
            3,
            JSON.stringify({}),
        ])
    })

    it("insertConversationEvent propaga o erro do banco", async () => {
        const client = { query: vi.fn().mockRejectedValue(new Error("db down")) }

        await expect(
            insertConversationEvent(client as never, "7", { type: "NO_SLOT" }),
        ).rejects.toThrow("db down")
    })

    it("listBySession devolve os eventos tipados na ordem do SELECT", async () => {
        const first = new Date("2030-01-01T12:00:00Z")
        const second = new Date("2030-01-01T12:01:00Z")
        query.mockResolvedValueOnce({
            rows: [
                {
                    type: "STARTED",
                    category_id: null,
                    question_id: null,
                    appointment_id: null,
                    data: {},
                    created_at: first,
                },
                {
                    type: "ANSWER_SENT",
                    category_id: "3",
                    question_id: "7",
                    appointment_id: null,
                    data: { llm: "NOT_CALLED" },
                    created_at: second,
                },
            ],
        })

        const events = await conversationEventRepository.listBySession("5")

        const [sql, values] = query.mock.calls[0] as [string, unknown[]]
        expect(sql).toContain("WHERE session_id = $1")
        expect(sql).toContain("ORDER BY created_at, id")
        expect(values).toEqual(["5"])
        expect(events).toEqual([
            { type: "STARTED", createdAt: first },
            { type: "ANSWER_SENT", categoryId: 3, questionId: 7, llm: "NOT_CALLED", createdAt: second },
        ])
    })

    it("listBySession devolve lista vazia quando a sessão não tem eventos", async () => {
        query.mockResolvedValueOnce({ rows: [] })

        const events = await conversationEventRepository.listBySession("5")

        expect(events).toEqual([])
    })

    it("listBySession descarta chave desconhecida vinda do banco", async () => {
        const createdAt = new Date("2030-01-01T12:00:00Z")
        query.mockResolvedValueOnce({
            rows: [
                {
                    type: "ATTENDEE_CHOSEN",
                    category_id: null,
                    question_id: null,
                    appointment_id: null,
                    data: { by_representative: false, note: "Meu nome é Maria Fictícia" },
                    created_at: createdAt,
                },
            ],
        })

        const events = await conversationEventRepository.listBySession("5")

        expect(events).toEqual([{ type: "ATTENDEE_CHOSEN", byRepresentative: false, createdAt }])
    })

    it("listBySession descarta a linha fora do contrato, registra o log sem dados do cidadão e devolve as outras", async () => {
        const sentinel = "Meu nome é Maria Fictícia e meu CPF é 000.000.000-00"
        const first = new Date("2030-01-01T12:00:00Z")
        const last = new Date("2030-01-01T12:03:00Z")
        const logger = { error: vi.fn() }
        const repository = createConversationEventRepository({ logger })
        query.mockResolvedValueOnce({
            rows: [
                {
                    type: "STARTED",
                    category_id: null,
                    question_id: null,
                    appointment_id: null,
                    data: {},
                    created_at: first,
                },
                {
                    type: "ANSWER_SENT",
                    category_id: "3",
                    question_id: "7",
                    appointment_id: null,
                    data: {},
                    created_at: new Date("2030-01-01T12:01:00Z"),
                },
                {
                    type: "ABANDONED",
                    category_id: null,
                    question_id: null,
                    appointment_id: null,
                    data: { step: sentinel },
                    created_at: new Date("2030-01-01T12:02:00Z"),
                },
                {
                    type: sentinel,
                    category_id: null,
                    question_id: null,
                    appointment_id: null,
                    data: {},
                    created_at: new Date("2030-01-01T12:02:30Z"),
                },
                {
                    type: "CATEGORY_CHOSEN",
                    category_id: "3",
                    question_id: null,
                    appointment_id: null,
                    data: {},
                    created_at: last,
                },
            ],
        })

        const events = await repository.listBySession("5")

        expect(events).toEqual([
            { type: "STARTED", createdAt: first },
            { type: "CATEGORY_CHOSEN", categoryId: 3, createdAt: last },
        ])
        expect(logger.error.mock.calls).toEqual([
            [expect.any(String), { type: "ANSWER_SENT", sessionId: "5", code: "INTERNAL_SERVER_ERROR" }],
            [expect.any(String), { type: "ABANDONED", sessionId: "5", code: "INTERNAL_SERVER_ERROR" }],
            [expect.any(String), { type: "INVALID", sessionId: "5", code: "INTERNAL_SERVER_ERROR" }],
        ])
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain("Maria")
    })

    it("listBySession não chama o log quando todas as linhas estão no contrato", async () => {
        const logger = { error: vi.fn() }
        const repository = createConversationEventRepository({ logger })
        query.mockResolvedValueOnce({
            rows: [
                {
                    type: "STARTED",
                    category_id: null,
                    question_id: null,
                    appointment_id: null,
                    data: {},
                    created_at: new Date("2030-01-01T12:00:00Z"),
                },
            ],
        })

        await repository.listBySession("5")

        expect(logger.error).not.toHaveBeenCalled()
    })

    it("listBySession propaga a falha da consulta", async () => {
        const logger = { error: vi.fn() }
        const repository = createConversationEventRepository({ logger })
        query.mockRejectedValueOnce(new Error("db down"))

        await expect(repository.listBySession("5")).rejects.toThrow("db down")
        expect(logger.error).not.toHaveBeenCalled()
    })
})
