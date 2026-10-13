import { beforeEach, describe, expect, it, vi } from "vitest"

const { query } = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock("../db/connection", () => ({
    default: () => ({ query }),
}))

import { conversationEventRepository } from "./conversationEvent.repository"

describe("conversationEventRepository", () => {
    beforeEach(() => {
        query.mockReset()
    })

    it("persists only typed answer metadata and distinguishes LLM failure", async () => {
        await conversationEventRepository.record("session-1", {
            type: "ANSWER_SENT",
            categoryId: 10,
            questionId: 20,
            llm: "FAILED",
        })

        const [sql, values] = query.mock.calls[0] as [string, unknown[]]
        expect(sql).toContain("category_id, question_id, appointment_id, data")
        expect(sql).not.toContain("text")
        expect(values).toEqual([
            "session-1",
            "ANSWER_SENT",
            10,
            20,
            null,
            JSON.stringify({ llm: "FAILED" }),
        ])
    })

    it("stores a response without calling the LLM as NOT_CALLED", async () => {
        await conversationEventRepository.record("session-1", {
            type: "ANSWER_SENT",
            categoryId: 10,
            questionId: 20,
            llm: "NOT_CALLED",
        })

        expect(query.mock.calls[0]?.[1]?.[5]).toBe(JSON.stringify({ llm: "NOT_CALLED" }))
    })
})
