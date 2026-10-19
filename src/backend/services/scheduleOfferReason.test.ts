import { describe, expect, it } from "vitest"
import type { ConversationEvent, RecordedConversationEvent } from "../types/conversationEvent.types"
import { offeredReasonOf } from "./scheduleOfferReason"

const start = new Date("2026-10-20T12:00:00.000Z").getTime()

function recorded(...events: ConversationEvent[]): RecordedConversationEvent[] {
    return events.map((event, index) => ({ ...event, createdAt: new Date(start + index * 1000) }))
}

const questionChosen: ConversationEvent = { type: "QUESTION_CHOSEN", categoryId: 1, questionId: 10 }

describe("offeredReasonOf", () => {
    it("devolve null quando a sessão não tem eventos", () => {
        expect(offeredReasonOf([])).toBeNull()
    })

    it("devolve null quando a sessão só escolheu a pergunta", () => {
        const events = recorded({ type: "STARTED" }, { type: "CATEGORY_CHOSEN", categoryId: 1 }, questionChosen)

        expect(offeredReasonOf(events)).toBeNull()
    })

    it("devolve REQUIRES_IN_PERSON da oferta feita depois da pergunta presencial", () => {
        const events = recorded(
            { type: "STARTED" },
            questionChosen,
            { type: "ANSWER_SENT", categoryId: 1, questionId: 10, llm: "NOT_CALLED" },
            { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" },
            { type: "ATTENDEE_CHOSEN", byRepresentative: false },
        )

        expect(offeredReasonOf(events)).toBe("REQUIRES_IN_PERSON")
    })

    it("devolve NOT_RESOLVED da oferta feita depois do Não em resolveu", () => {
        const events = recorded(
            questionChosen,
            { type: "ANSWER_SENT", categoryId: 1, questionId: 10, llm: "USED" },
            { type: "RESOLVED_ANSWERED", resolved: false },
            { type: "SCHEDULE_OFFERED", reason: "NOT_RESOLVED" },
        )

        expect(offeredReasonOf(events)).toBe("NOT_RESOLVED")
    })

    it("com duas ofertas depois da pergunta, vale a última", () => {
        const events = recorded(
            questionChosen,
            { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" },
            { type: "SCHEDULE_OFFERED", reason: "NOT_RESOLVED" },
        )

        expect(offeredReasonOf(events)).toBe("NOT_RESOLVED")
    })

    it("devolve null quando a última oferta é de antes da última pergunta escolhida", () => {
        const events = recorded(
            questionChosen,
            { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" },
            { type: "SCHEDULE_DECLINED" },
            { type: "QUESTION_CHOSEN", categoryId: 2, questionId: 20 },
            { type: "ANSWER_SENT", categoryId: 2, questionId: 20, llm: "NOT_CALLED" },
        )

        expect(offeredReasonOf(events)).toBeNull()
    })
})
