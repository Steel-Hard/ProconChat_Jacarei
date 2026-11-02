import { createHmac } from "crypto"
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"
import getPool from "../../db/connection"
import { PgMotorDecisaoRepository } from "../../repositories/motorDecisao.repository"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import { conversationEventService } from "../../services/conversationEvent.service"
import { createConversationFlowService } from "../../services/conversationFlow.service"
import { createLlmComplementService } from "../../services/llmComplement.service"
import { MotorDecisaoService } from "../../services/motorDecisao.service"
import { createScheduleService } from "../../services/schedule.service"
import { hashPhone } from "../../services/whatsappSession.service"
import type { LlmComplementJob } from "../../types/llm.types"

const sentinel = "Texto livre do cidadão de teste"
const phone = "5500000000981"
const CLOCK_OFFSET_MS = 50

let categoryId = ""
let questionId = ""

function phoneHash(value: string): string {
    const secret = process.env.PHONE_HASH_SECRET
    if (!secret) {
        throw new Error("PHONE_HASH_SECRET is required for integration tests")
    }
    return createHmac("sha256", secret).update(value).digest("hex")
}

async function removeTestSessions(): Promise<void> {
    await getPool().query("DELETE FROM Sessions WHERE phone_hash = $1", [phoneHash(phone)])
}

function sleepUntil(instant: number): Promise<void> {
    return vi.waitFor(() => {
        if (Date.now() <= instant) {
            throw new Error("o relógio ainda não passou do horário esperado")
        }
    })
}

describe("Complemento por IA com Postgres", () => {
    beforeAll(async () => {
        await removeTestSessions()
        const pool = getPool()
        categoryId = (
            await pool.query<{ id: string }>(
                "INSERT INTO Categories (title, short_title) VALUES ('Categoria de teste #66', 'Teste 66') RETURNING id",
            )
        ).rows[0]?.id as string
        questionId = (
            await pool.query<{ id: string }>(
                `INSERT INTO Questions (category_id, question, answer, short_title, out_of_scope, llm_allowed)
                 VALUES ($1, 'Pergunta com IA de teste #66', 'Resposta de teste.', 'Teste 66', false, true) RETURNING id`,
                [categoryId],
            )
        ).rows[0]?.id as string
    })

    afterAll(async () => {
        await removeTestSessions()
        await getPool().query("DELETE FROM Questions WHERE id = $1", [questionId])
        await getPool().query("DELETE FROM Categories WHERE id = $1", [categoryId])
        await getPool().end()
    })

    test("pergunta com IA permitida grava o ANSWER_SENT USED só quando o job termina, com o horário da resposta, entre QUESTION_CHOSEN e RESOLVED_ANSWERED", async () => {
        const jobs: LlmComplementJob[] = []
        let answeredAt = new Date(0)
        const flow = createConversationFlowService({
            sessions: sessionRepository,
            events: conversationEventService,
            motor: new MotorDecisaoService(new PgMotorDecisaoRepository()),
            schedule: createScheduleService(scheduleRepository),
            hashPhone,
            logger: console,
            isAutoReplyPaused: async () => false,
            scheduleComplement: (job) => {
                jobs.push(job)
            },
            now: () => {
                answeredAt = new Date(Date.now() + CLOCK_OFFSET_MS)
                return answeredAt
            },
        })
        const gateway = { sendText: vi.fn(async () => ({ ok: true as const })) }
        const deliver = createLlmComplementService({
            generate: async () => ({ explicacaoLlm: "Complemento de teste", geradoPorLlm: true, status: "USED" }),
            gateway,
            events: conversationEventService,
            logger: { log: vi.fn() },
        })

        const first = await flow({ phone, text: sentinel })
        await flow({ phone, text: sentinel })
        await flow({ phone, text: "1 " + sentinel })
        await flow({ phone, optionId: `cat_${categoryId}` })
        const chosen = await flow({ phone, text: "1" })
        const sessionId = first.sessionId as string

        expect(chosen.reply.step).toBe("AWAITING_RESOLVED")
        expect(jobs).toHaveLength(1)
        expect(jobs[0]).toMatchObject({
            sessionId,
            categoryId: Number(categoryId),
            questionId: Number(questionId),
            phone,
            answeredAt,
        })
        expect((await conversationEventService.listBySession(sessionId)).map((event) => event.type)).toEqual([
            "STARTED",
            "CATEGORY_CHOSEN",
            "QUESTION_CHOSEN",
        ])

        await sleepUntil(answeredAt.getTime() + CLOCK_OFFSET_MS)
        const closing = await flow({ phone, text: "1" })
        expect(closing.reply.step).toBe("FINISHED")
        await deliver(jobs[0] as LlmComplementJob)

        const events = await conversationEventService.listBySession(sessionId)
        expect(events.map((event) => event.type)).toEqual([
            "STARTED",
            "CATEGORY_CHOSEN",
            "QUESTION_CHOSEN",
            "ANSWER_SENT",
            "RESOLVED_ANSWERED",
        ])
        expect(events[3]).toEqual({
            type: "ANSWER_SENT",
            categoryId: Number(categoryId),
            questionId: Number(questionId),
            llm: "USED",
            createdAt: answeredAt,
        })
        expect(gateway.sendText).toHaveBeenCalledExactlyOnceWith({
            to: phone,
            text: "Complemento de teste\n\nGerado com auxílio de IA",
        })
    })
})
