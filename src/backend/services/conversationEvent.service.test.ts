import { describe, expect, it, vi } from "vitest"
import { MockConversationEventRepository } from "../repositories/conversationEventMock.repository"
import type { SessionClosing } from "../types/conversationEvent.types"
import { createConversationEventService } from "./conversationEvent.service"

const sentinel = "Meu nome é Maria Fictícia e meu CPF é 000.000.000-00"

function setup() {
    const events = new MockConversationEventRepository()
    const finish = vi.fn().mockResolvedValue(undefined)
    const logger = { error: vi.fn() }
    const service = createConversationEventService({ events, sessions: { finish }, logger })

    return { events, finish, logger, service }
}

describe("conversationEvent.service", () => {
    it("record delega ao repositório", async () => {
        const { events, logger, service } = setup()

        await service.record("12", { type: "CATEGORY_CHOSEN", categoryId: 3 })

        expect(events.calls).toEqual([
            { method: "record", args: ["12", { type: "CATEGORY_CHOSEN", categoryId: 3 }] },
        ])
        expect(logger.error).not.toHaveBeenCalled()
    })

    it("record resolve e registra no log quando o repositório falha", async () => {
        const { events, logger, service } = setup()
        events.failWith(Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" }))

        await expect(service.record("12", { type: "NO_SLOT" })).resolves.toBeUndefined()

        expect(logger.error).toHaveBeenCalledOnce()
        expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
            type: "NO_SLOT",
            sessionId: "12",
            code: "ECONNREFUSED",
        })
    })

    it("record resolve e não repassa a sentinela ao log quando o evento é inválido", async () => {
        const { logger, service } = setup()
        const invalid = { type: "STARTED", text: sentinel }

        await expect(service.record("12", invalid as never)).resolves.toBeUndefined()

        expect(logger.error).toHaveBeenCalledOnce()
        expect(logger.error.mock.calls[0]?.[1]).toEqual({
            type: "STARTED",
            sessionId: "12",
            code: "INTERNAL_SERVER_ERROR",
        })
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain(sentinel)
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain("Maria")
    })

    it("record registra INVALID quando o tipo ou o id da sessão não são do contrato", async () => {
        const { logger, service } = setup()

        await service.record(sentinel, { type: sentinel } as never)

        expect(logger.error.mock.calls[0]?.[1]).toEqual({
            type: "INVALID",
            sessionId: "INVALID",
            code: "INTERNAL_SERVER_ERROR",
        })
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain(sentinel)
    })

    it("record não repassa ao log um código de erro com texto livre", async () => {
        const { events, logger, service } = setup()
        events.failWith(Object.assign(new Error(sentinel), { code: sentinel }))

        await service.record("12", { type: "NO_SLOT" })

        expect(logger.error.mock.calls[0]?.[1]).toEqual({ type: "NO_SLOT", sessionId: "12", code: "UNKNOWN" })
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain(sentinel)
    })

    it.each<SessionClosing>([
        { outcome: "RESOLVED", event: { type: "RESOLVED_ANSWERED", resolved: true } },
        {
            outcome: "OUT_OF_SCOPE",
            event: { type: "ANSWER_SENT", categoryId: 1, questionId: 2, llm: "NOT_CALLED" },
        },
        { outcome: "SCHEDULED", event: { type: "APPOINTMENT_CREATED", appointmentId: 4 } },
        { outcome: "NO_SLOT", event: { type: "NO_SLOT" } },
        { outcome: "DECLINED", event: { type: "SCHEDULE_DECLINED" } },
        { outcome: "MANAGED_APPOINTMENT", event: { type: "APPOINTMENT_CANCELED", appointmentId: 4 } },
    ])("finish delega o fechamento $outcome ao repositório de sessões", async (closing) => {
        const { finish, service } = setup()

        await service.finish("12", closing)

        expect(finish).toHaveBeenCalledWith("12", closing)
    })

    it("finish propaga a falha do encerramento", async () => {
        const { finish, logger, service } = setup()
        finish.mockRejectedValueOnce(new Error("session already finished"))

        await expect(
            service.finish("12", { outcome: "NO_SLOT", event: { type: "NO_SLOT" } }),
        ).rejects.toThrow("session already finished")
        expect(logger.error).not.toHaveBeenCalled()
    })

    it("listBySession devolve o que o repositório devolve", async () => {
        const { events, service } = setup()
        await events.record("12", { type: "STARTED" })
        await events.record("12", { type: "CATEGORY_CHOSEN", categoryId: 3 })
        await events.record("13", { type: "STARTED" })

        const list = await service.listBySession("12")

        expect(list).toEqual([
            { type: "STARTED", createdAt: expect.any(Date) },
            { type: "CATEGORY_CHOSEN", categoryId: 3, createdAt: expect.any(Date) },
        ])
    })
})
