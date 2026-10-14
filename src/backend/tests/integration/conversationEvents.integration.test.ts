import { createHmac } from "crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { conversationEventRepository } from "../../repositories/conversationEvent.repository"
import type { Queryable } from "../../repositories/conversationEvent.repository"
import { finishSessionWith, sessionRepository } from "../../repositories/session.repository"

const sentinel = "Meu nome é Maria Fictícia e meu CPF é 000.000.000-00"

const phones = {
    resolved: "5500000000991",
    outOfScope: "5500000000992",
    abandoned: "5500000000993",
    transaction: "5500000000994",
    invalidRow: "5500000000995",
    finishFails: "5500000000996",
}

let categoryId = ""
let categoryOption = ""
const questionIds: string[] = []

function phoneHash(phone: string): string {
    const secret = process.env.PHONE_HASH_SECRET
    if (!secret) {
        throw new Error("PHONE_HASH_SECRET is required for integration tests")
    }
    return createHmac("sha256", secret).update(phone).digest("hex")
}

async function send(phone: string, text?: string) {
    const response = await request(app)
        .post("/api/v1/whatsapp/sessions")
        .set("X-Internal-Token", process.env.GATEWAY_INTERNAL_TOKEN as string)
        .send({ phone, text })

    expect(response.status).toBe(202)
    return response.body.data as { sessionId: string; newSession: boolean; reply: { step: string } }
}

async function removeTestSessions(): Promise<void> {
    await getPool().query("DELETE FROM Sessions WHERE phone_hash = ANY($1::text[])", [
        Object.values(phones).map(phoneHash),
    ])
}

async function eventsOf(sessionId: string) {
    const result = await getPool().query<{ type: string; data: unknown }>(
        "SELECT type, data FROM ConversationEvents WHERE session_id = $1 ORDER BY created_at, id",
        [sessionId],
    )
    return result.rows
}

async function sessionOf(sessionId: string) {
    const result = await getPool().query<{
        status: string
        outcome: string
        draft: unknown
        abandoned_at_step: string | null
        current_step: string
    }>("SELECT status, outcome, draft, abandoned_at_step, current_step FROM Sessions WHERE id = $1", [sessionId])
    return result.rows[0]
}

async function talkUntilAnswer(
    phone: string,
    questionOption: string,
    expectedStep: string,
): Promise<string> {
    const first = await send(phone, sentinel)
    await send(phone, sentinel)
    await send(phone, "1 " + sentinel)
    await send(phone, categoryOption)
    await send(phone, sentinel)
    await send(phone, "abc")
    const last = await send(phone, questionOption)

    expect(last.sessionId).toBe(first.sessionId)
    expect(last.reply.step).toBe(expectedStep)
    return first.sessionId
}

async function markResolved(phone: string, sessionId: string): Promise<void> {
    const closing = await send(phone, "1")

    expect(closing.sessionId).toBe(sessionId)
    expect(closing.reply.step).toBe("FINISHED")
}

describe("Eventos da conversa com Postgres", () => {
    beforeAll(async () => {
        await removeTestSessions()
        const pool = getPool()
        categoryId = (
            await pool.query<{ id: string }>(
                "INSERT INTO Categories (title, short_title) VALUES ('Categoria de teste #16', 'Teste 16') RETURNING id",
            )
        ).rows[0]?.id as string
        for (const [question, outOfScope] of [
            ["Pergunta comum de teste #16", false],
            ["Pergunta fora do escopo de teste #16", true],
        ] as const) {
            const inserted = await pool.query<{ id: string }>(
                `INSERT INTO Questions (category_id, question, answer, short_title, out_of_scope, llm_allowed)
                 VALUES ($1, $2, 'Resposta de teste.', 'Teste 16', $3, $4) RETURNING id`,
                [categoryId, question, outOfScope, !outOfScope],
            )
            questionIds.push(inserted.rows[0]?.id as string)
        }
        const categories = await pool.query<{ id: string }>(
            "SELECT id FROM Categories WHERE active = true ORDER BY id ASC",
        )
        categoryOption = String(categories.rows.findIndex((row) => row.id === categoryId) + 1)
    })

    afterAll(async () => {
        await removeTestSessions()
        await getPool().query("DELETE FROM Questions WHERE id = ANY($1::bigint[])", [questionIds])
        await getPool().query("DELETE FROM Categories WHERE id = $1", [categoryId])
        await getPool().end()
    })

    test("conversa completa grava os eventos em ordem e encerra como RESOLVED sem draft", async () => {
        const sessionId = await talkUntilAnswer(phones.resolved, "1", "AWAITING_RESOLVED")
        await markResolved(phones.resolved, sessionId)

        expect(await eventsOf(sessionId)).toEqual([
            { type: "STARTED", data: {} },
            { type: "CATEGORY_CHOSEN", data: {} },
            { type: "QUESTION_CHOSEN", data: {} },
            { type: "ANSWER_SENT", data: { llm: "NOT_CALLED" } },
            { type: "RESOLVED_ANSWERED", data: { resolved: true } },
        ])
        expect(await sessionOf(sessionId)).toEqual({
            status: "FINISHED",
            outcome: "RESOLVED",
            draft: null,
            abandoned_at_step: null,
            current_step: "FINISHED",
        })
    })

    test("pergunta fora do escopo encerra como OUT_OF_SCOPE", async () => {
        const sessionId = await talkUntilAnswer(phones.outOfScope, "2", "FINISHED")

        expect((await sessionOf(sessionId))?.outcome).toBe("OUT_OF_SCOPE")
        expect((await eventsOf(sessionId)).at(-1)).toEqual({ type: "ANSWER_SENT", data: { llm: "NOT_CALLED" } })
    })

    test("abandono limpa o draft, guarda a etapa e calcula ended_at a partir da última interação", async () => {
        const stale = await send(phones.abandoned, sentinel)
        const original = (
            await getPool().query<{ last_interaction_at: Date }>(
                `UPDATE Sessions
                 SET current_step = 'AWAITING_QUESTION',
                     current_category_id = $2,
                     draft = '{"by_representative": true}'::jsonb,
                     last_interaction_at = now() - interval '31 minutes'
                 WHERE id = $1
                 RETURNING last_interaction_at`,
                [stale.sessionId, categoryId],
            )
        ).rows[0]?.last_interaction_at

        const next = await send(phones.abandoned, sentinel)

        expect(next.newSession).toBe(true)
        expect(next.sessionId).not.toBe(stale.sessionId)
        const abandoned = await getPool().query<{
            status: string
            outcome: string
            abandoned_at_step: string
            draft: unknown
            last_interaction_at: Date
            ended_at_matches: boolean
        }>(
            `SELECT status, outcome, abandoned_at_step, draft, last_interaction_at,
                    ended_at = last_interaction_at + interval '30 minutes' AS ended_at_matches
             FROM Sessions WHERE id = $1`,
            [stale.sessionId],
        )
        expect(abandoned.rows[0]).toEqual({
            status: "ABANDONED",
            outcome: "ABANDONED",
            abandoned_at_step: "AWAITING_QUESTION",
            draft: null,
            last_interaction_at: original,
            ended_at_matches: true,
        })
        expect(await eventsOf(stale.sessionId)).toEqual([
            { type: "STARTED", data: {} },
            { type: "ABANDONED", data: { step: "AWAITING_QUESTION" } },
        ])
        expect(await eventsOf(next.sessionId)).toEqual([{ type: "STARTED", data: {} }])
    })

    test("nenhuma linha de Sessions ou ConversationEvents dos telefones de teste contém o texto do cidadão", async () => {
        const result = await getPool().query<{ row: string }>(
            `SELECT row_to_json(s)::text AS row FROM Sessions s WHERE s.phone_hash = ANY($1::text[])
             UNION ALL
             SELECT row_to_json(e)::text AS row FROM ConversationEvents e
             JOIN Sessions s ON s.id = e.session_id
             WHERE s.phone_hash = ANY($1::text[])`,
            [Object.values(phones).map(phoneHash)],
        )

        expect(result.rows.length).toBeGreaterThan(0)
        const everything = result.rows.map((row) => row.row).join("\n")
        expect(everything).not.toContain(sentinel)
        expect(everything).not.toContain("Maria")
        expect(everything).not.toContain("000.000.000-00")
        expect(everything).not.toContain(phones.resolved)
    })

    test("finish numa sessão já encerrada falha e não deixa evento de fechamento", async () => {
        const session = await getPool().query<{ id: string }>(
            "SELECT id FROM Sessions WHERE phone_hash = $1 AND status = 'FINISHED' LIMIT 1",
            [phoneHash(phones.resolved)],
        )
        const sessionId = session.rows[0]?.id as string
        const before = await eventsOf(sessionId)

        await expect(
            sessionRepository.finish(sessionId, { outcome: "NO_SLOT", event: { type: "NO_SLOT" } }),
        ).rejects.toThrow()

        expect(await eventsOf(sessionId)).toEqual(before)
    })

    test("finishSessionWith dentro de uma transação desfeita não deixa evento nem muda a sessão", async () => {
        const { sessionId } = await send(phones.transaction, sentinel)
        const client = await getPool().connect()

        try {
            await client.query("BEGIN")
            await finishSessionWith(client, sessionId, { outcome: "NO_SLOT", event: { type: "NO_SLOT" } })
            await client.query("ROLLBACK")
        } finally {
            client.release()
        }

        expect((await sessionOf(sessionId))?.status).toBe("IN_PROGRESS")
        expect(await eventsOf(sessionId)).toEqual([{ type: "STARTED", data: {} }])
    })

    test("INSERT direto com texto livre em data é recusado pelo banco", async () => {
        const { sessionId } = await send(phones.transaction, "1")

        await expect(
            getPool().query(
                "INSERT INTO ConversationEvents (session_id, type, data) VALUES ($1, 'ANSWER_SENT', $2::jsonb)",
                [sessionId, JSON.stringify({ llm: sentinel })],
            ),
        ).rejects.toMatchObject({ code: "23514" })
    })

    test("listBySession devolve os eventos da conversa completa na ordem certa", async () => {
        const session = await getPool().query<{ id: string }>(
            "SELECT id FROM Sessions WHERE phone_hash = $1 AND outcome = 'RESOLVED' LIMIT 1",
            [phoneHash(phones.resolved)],
        )

        const events = await conversationEventRepository.listBySession(session.rows[0]?.id as string)

        expect(events.map(({ createdAt, ...event }) => {
            expect(createdAt).toBeInstanceOf(Date)
            return event
        })).toEqual([
            { type: "STARTED" },
            { type: "CATEGORY_CHOSEN", categoryId: Number(categoryId) },
            { type: "QUESTION_CHOSEN", categoryId: Number(categoryId), questionId: Number(questionIds[0]) },
            {
                type: "ANSWER_SENT",
                categoryId: Number(categoryId),
                questionId: Number(questionIds[0]),
                llm: "NOT_CALLED",
            },
            { type: "RESOLVED_ANSWERED", resolved: true },
        ])
    })

    test("listBySession descarta a linha fora do contrato gravada por fora e registra o log sem dados do cidadão", async () => {
        const { sessionId } = await send(phones.invalidRow, sentinel)
        await getPool().query(
            "INSERT INTO ConversationEvents (session_id, type, data) VALUES ($1, 'ANSWER_SENT', '{}'::jsonb)",
            [sessionId],
        )
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined)

        try {
            const events = await conversationEventRepository.listBySession(sessionId)

            expect(events.map((event) => event.type)).toEqual(["STARTED"])
            expect(error).toHaveBeenCalledOnce()
            expect(error).toHaveBeenCalledWith(expect.any(String), {
                type: "ANSWER_SENT",
                sessionId,
                code: "INTERNAL_SERVER_ERROR",
            })
            expect(JSON.stringify(error.mock.calls)).not.toContain("Maria")
        } finally {
            error.mockRestore()
        }
    })

    test("falha do encerramento no fluxo entrega a resposta e deixa a sessão IN_PROGRESS sem RESOLVED_ANSWERED", async () => {
        const finish = vi.spyOn(sessionRepository, "finish").mockImplementation(async (sessionId, closing) => {
            const client = await getPool().connect()
            const failingOnSessionUpdate = {
                query: (sql: string, values?: unknown[]) =>
                    /UPDATE\s+Sessions/i.test(sql)
                        ? Promise.reject(Object.assign(new Error("falha simulada"), { code: "57P01" }))
                        : client.query(sql, values),
            } as unknown as Queryable
            try {
                await client.query("BEGIN")
                await finishSessionWith(failingOnSessionUpdate, sessionId, closing)
                await client.query("COMMIT")
            } catch (error) {
                await client.query("ROLLBACK")
                throw error
            } finally {
                client.release()
            }
        })
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined)

        try {
            const sessionId = await talkUntilAnswer(phones.finishFails, "1", "AWAITING_RESOLVED")
            await markResolved(phones.finishFails, sessionId)

            expect(finish).toHaveBeenCalledOnce()
            expect(await sessionOf(sessionId)).toEqual({
                status: "IN_PROGRESS",
                outcome: "IN_PROGRESS",
                draft: null,
                abandoned_at_step: null,
                current_step: "AWAITING_RESOLVED",
            })
            expect((await eventsOf(sessionId)).map((event) => event.type)).toEqual([
                "STARTED",
                "CATEGORY_CHOSEN",
                "QUESTION_CHOSEN",
                "ANSWER_SENT",
            ])
            expect(error).toHaveBeenCalledWith(expect.any(String), {
                type: "RESOLVED_ANSWERED",
                sessionId,
                code: "57P01",
            })
        } finally {
            finish.mockRestore()
            error.mockRestore()
        }
    })
})
