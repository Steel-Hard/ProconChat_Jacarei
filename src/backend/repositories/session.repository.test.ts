import { beforeEach, describe, expect, it, vi } from "vitest"
import InternalServerError from "../errors/InternalServerError"
import type { SessionClosing } from "../types/conversationEvent.types"

const { query, release } = vi.hoisted(() => ({
    query: vi.fn(),
    release: vi.fn(),
}))

vi.mock("../db/connection", () => ({
    default: () => ({
        connect: async () => ({ query, release }),
    }),
}))

import { finishSessionWith, sessionRepository } from "./session.repository"

const resolvedClosing: SessionClosing = {
    outcome: "RESOLVED",
    event: { type: "RESOLVED_ANSWERED", resolved: true },
}

function sqlOf(call: unknown[] | undefined): string {
    return String(call?.[0] ?? "")
}

describe("sessionRepository", () => {
    beforeEach(() => {
        query.mockReset()
        release.mockReset()
    })

    it("records an abandonment step atomically before opening the next session", async () => {
        query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{
                    id: "101",
                    current_step: "AWAITING_CATEGORY",
                    current_category_id: null,
                }],
            })
            .mockResolvedValueOnce({ rows: [] })

        const session = await sessionRepository.findOrCreateActive("phone-hash")

        expect(session).toEqual({
            id: "101",
            created: true,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
        })
        const [abandonmentSql, values] = query.mock.calls[1] as [string, unknown[]]
        expect(abandonmentSql).toContain("last_interaction_at <= now() - interval '30 minutes'")
        expect(abandonmentSql).toContain("abandoned_at_step = stale.current_step")
        expect(abandonmentSql).toContain("jsonb_build_object('step', current_step)")
        expect(abandonmentSql).toContain("draft = NULL")
        expect(abandonmentSql).toContain("ended_at = stale.last_interaction_at + interval '30 minutes'")
        expect(abandonmentSql).not.toMatch(/last_interaction_at\s*=\s*now\(\)/)
        expect(values).toEqual(["phone-hash"])
        expect(query.mock.calls.at(-1)?.[0]).toBe("COMMIT")
        expect(release).toHaveBeenCalledOnce()
    })

    it("grava STARTED na mesma transação da criação da sessão, antes do COMMIT", async () => {
        query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{ id: "101", current_step: "AWAITING_CATEGORY", current_category_id: null }],
            })
            .mockResolvedValue({ rows: [], rowCount: 1 })

        await sessionRepository.findOrCreateActive("phone-hash")

        const calls = query.mock.calls.map((call) => sqlOf(call))
        const startedIndex = calls.findIndex((sql) => /INSERT INTO ConversationEvents/i.test(sql) && !sql.includes("WITH stale"))
        expect(startedIndex).toBeGreaterThan(-1)
        expect(query.mock.calls[startedIndex]?.[1]).toEqual(["101", "STARTED", null, null, null, "{}"])
        expect(calls.indexOf("COMMIT")).toBeGreaterThan(startedIndex)
    })

    it("não grava STARTED quando a sessão em andamento já existe", async () => {
        query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{ id: "101", current_step: "AWAITING_QUESTION", current_category_id: "3" }],
            })
            .mockResolvedValueOnce({ rows: [] })

        const session = await sessionRepository.findOrCreateActive("phone-hash")

        expect(session.created).toBe(false)
        const inserts = query.mock.calls
            .map((call) => sqlOf(call))
            .filter((sql) => /INSERT INTO ConversationEvents/i.test(sql) && !sql.includes("WITH stale"))
        expect(inserts).toEqual([])
    })

    it("desfaz a criação da sessão quando a gravação de STARTED falha", async () => {
        query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{ id: "101", current_step: "AWAITING_CATEGORY", current_category_id: null }],
            })
            .mockRejectedValueOnce(new Error("insert failed"))
            .mockResolvedValue({ rows: [] })

        await expect(sessionRepository.findOrCreateActive("phone-hash")).rejects.toThrow("insert failed")

        const calls = query.mock.calls.map((call) => sqlOf(call))
        expect(calls).toContain("ROLLBACK")
        expect(calls).not.toContain("COMMIT")
        expect(release).toHaveBeenCalledOnce()
    })

    it("finish grava o evento de fechamento e encerra a sessão com draft limpo na mesma transação", async () => {
        query.mockResolvedValue({ rows: [], rowCount: 1 })

        await sessionRepository.finish("55", resolvedClosing)

        const calls = query.mock.calls.map((call) => sqlOf(call))
        expect(calls[0]).toBe("BEGIN")
        expect(calls[1]).toMatch(/INSERT INTO ConversationEvents/i)
        expect(query.mock.calls[1]?.[1]).toEqual([
            "55",
            "RESOLVED_ANSWERED",
            null,
            null,
            null,
            JSON.stringify({ resolved: true }),
        ])
        expect(calls[2]).toContain("status = 'FINISHED'")
        expect(calls[2]).toContain("current_step = 'FINISHED'")
        expect(calls[2]).toContain("draft = NULL")
        expect(calls[2]).toContain("ended_at = now()")
        expect(calls[2]).toContain("status = 'IN_PROGRESS'")
        expect(query.mock.calls[2]?.[1]).toEqual(["55", "RESOLVED"])
        expect(calls[3]).toBe("COMMIT")
        expect(release).toHaveBeenCalledOnce()
    })

    it("finish desfaz o evento e lança quando a sessão já não está em andamento", async () => {
        query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValue({ rows: [] })

        await expect(sessionRepository.finish("55", resolvedClosing)).rejects.toThrow()

        const calls = query.mock.calls.map((call) => sqlOf(call))
        expect(calls.at(-1)).toBe("ROLLBACK")
        expect(calls).not.toContain("COMMIT")
        expect(release).toHaveBeenCalledOnce()
    })

    it("finishSessionWith recusa fechamento incompatível sem consultar o banco", async () => {
        const db = { query: vi.fn() }

        await expect(
            finishSessionWith(db as never, "55", {
                outcome: "SCHEDULED",
                event: { type: "NO_SLOT" },
            }),
        ).rejects.toBeInstanceOf(InternalServerError)
        await expect(
            finishSessionWith(db as never, "55", {
                outcome: "ABANDONED",
                event: { type: "ABANDONED", step: "AWAITING_CATEGORY" },
            } as unknown as SessionClosing),
        ).rejects.toBeInstanceOf(InternalServerError)
        expect(db.query).not.toHaveBeenCalled()
    })

    it("finishSessionWith usa o db recebido e propaga o erro sem ROLLBACK próprio", async () => {
        const db = {
            query: vi
                .fn()
                .mockResolvedValueOnce({ rows: [], rowCount: 1 })
                .mockRejectedValueOnce(new Error("update failed")),
        }

        await expect(finishSessionWith(db as never, "55", resolvedClosing)).rejects.toThrow("update failed")

        const calls = db.query.mock.calls.map((call) => sqlOf(call))
        expect(calls).toHaveLength(2)
        expect(calls).not.toContain("ROLLBACK")
        expect(query).not.toHaveBeenCalled()
    })

    it("finishSessionWith lança quando nenhuma sessão em andamento foi atualizada", async () => {
        const db = {
            query: vi
                .fn()
                .mockResolvedValueOnce({ rows: [], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [], rowCount: 0 }),
        }

        await expect(finishSessionWith(db as never, "55", resolvedClosing)).rejects.toThrow()
    })

    it("sweepAbandonedSessions executa CTE de abandono e grava eventos para sessões inativas", async () => {
        query
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: "10" }, { id: "11" }], rowCount: 2 }) // CTE
            .mockResolvedValueOnce({ rows: [] }) // COMMIT

        const count = await sessionRepository.sweepAbandonedSessions()

        expect(count).toBe(2)
        const [sweepSql] = query.mock.calls[1] as [string, unknown[]]
        expect(sweepSql).toContain("last_interaction_at <= now() - interval '30 minutes'")
        expect(sweepSql).toContain("status = 'ABANDONED'")
        expect(sweepSql).toContain("outcome = 'ABANDONED'")
        expect(sweepSql).toContain("abandoned_at_step = stale.current_step")
        expect(sweepSql).toContain("draft = NULL")
        expect(sweepSql).toContain("ended_at = stale.last_interaction_at + interval '30 minutes'")
        expect(sweepSql).not.toMatch(/last_interaction_at\s*=\s*now\(\)/)
    })
})
