import { createHmac } from "crypto"
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"
import getPool from "../../db/connection"
import { PgMotorDecisaoRepository } from "../../repositories/motorDecisao.repository"
import { scheduleRepository } from "../../repositories/schedule.repository"
import { sessionRepository } from "../../repositories/session.repository"
import { conversationEventService } from "../../services/conversationEvent.service"
import { createConversationFlowService } from "../../services/conversationFlow.service"
import { createLlmAnswerService } from "../../services/llmAnswer.service"
import { MotorDecisaoService } from "../../services/motorDecisao.service"
import { createScheduleService } from "../../services/schedule.service"
import { hashPhone } from "../../services/whatsappSession.service"

const sentinel = "Texto livre do cidadão de teste"
const phone = "5500000000981"

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

describe("Resposta escrita pela IA com Postgres", () => {
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
                `INSERT INTO Questions (category_id, question, answer, short_title, out_of_scope, requires_in_person, llm_allowed)
                 VALUES ($1, 'Pergunta presencial com IA de teste #66', 'Resposta de teste.', 'Teste 66', false, true, true) RETURNING id`,
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

    test("pergunta presencial com IA permitida grava QUESTION_CHOSEN, ANSWER_SENT USED e SCHEDULE_OFFERED nessa ordem", async () => {
        const sendMessages = vi.fn(async () => ({ ok: true as const }))
        const deliver = createLlmAnswerService({
            llm: { isAvailable: async () => true },
            generate: async () => ({ explicacaoLlm: "Resposta de teste reescrita.", geradoPorLlm: true, status: "USED" }),
            gateway: { sendMessages },
            events: conversationEventService,
            logger: { log: vi.fn() },
        })
        let delivery: Promise<void> = Promise.resolve()
        const flow = createConversationFlowService({
            sessions: sessionRepository,
            events: conversationEventService,
            motor: new MotorDecisaoService(new PgMotorDecisaoRepository()),
            schedule: createScheduleService(scheduleRepository),
            hashPhone,
            logger: console,
            isAutoReplyPaused: async () => false,
            deliverAnswer: (job) => {
                delivery = deliver(job)
                return delivery
            },
            answerLogger: { log: vi.fn() },
        })

        const first = await flow({ phone, text: sentinel })
        await flow({ phone, text: sentinel })
        await flow({ phone, text: "1 " + sentinel })
        await flow({ phone, optionId: `cat_${categoryId}` })
        const chosen = await flow({ phone, text: "1" })
        await delivery
        const sessionId = first.sessionId as string

        expect(chosen.reply).toEqual({ text: "", step: "AWAITING_SCHEDULE_OFFER", messages: [], typing: true })
        expect(sendMessages).toHaveBeenCalledOnce()
        const events = await conversationEventService.listBySession(sessionId)
        expect(events.map((event) => event.type)).toEqual([
            "STARTED",
            "CATEGORY_CHOSEN",
            "QUESTION_CHOSEN",
            "ANSWER_SENT",
            "SCHEDULE_OFFERED",
        ])
        expect(events[3]).toMatchObject({
            type: "ANSWER_SENT",
            categoryId: Number(categoryId),
            questionId: Number(questionId),
            llm: "USED",
        })
        expect(events[4]).toMatchObject({ type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" })
    })
})
