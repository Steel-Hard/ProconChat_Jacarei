import { beforeEach, describe, expect, test, vi } from "vitest"
import { InMemorySessionRepository } from "../repositories/mock/sessionMock.repository"
import {
    categorias,
    mockBookResult,
    mockSlots,
    perguntas,
    respostaPadrao,
    slotOptionId,
} from "./mock/conversationFlow.fixtures"
import { createConversationFlowHarness } from "./mock/conversationFlowHarness"

describe("conversationFlow.service", () => {
    const {
        iniciarSessao,
        escolherCategoria,
        processarPergunta,
        getAvailableSlots,
        bookSlot,
        createFlow,
    } = createConversationFlowHarness()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("Fluxo de Agendamento Presencial (#56)", () => {
        test("fluxo completo mantendo estado: oi -> categoria -> pergunta -> agendar -> eu mesmo -> nome -> CPF -> horário -> agendamento concluído", async () => {
            const statefulSessions = new InMemorySessionRepository({ ids: ["sess_full_1"] })
            const sessionDb = () => statefulSessions.snapshot("sess_full_1")

            const statefulFlow = createFlow({ sessions: statefulSessions })

            iniciarSessao.mockResolvedValue(categorias)
            escolherCategoria.mockResolvedValue(perguntas)
            processarPergunta.mockResolvedValue(respostaPadrao)
            getAvailableSlots.mockResolvedValue(mockSlots)
            bookSlot.mockResolvedValue(mockBookResult)

            const citizenPhone = "5512991112233"

            const r1 = await statefulFlow({ phone: citizenPhone, text: "oi" })
            expect(r1.reply.step).toBe("AWAITING_CATEGORY")

            const r2 = await statefulFlow({ phone: citizenPhone, text: "1" })
            expect(r2.reply.step).toBe("AWAITING_QUESTION")
            expect(sessionDb()?.currentCategoryId).toBe("1")

            const r3 = await statefulFlow({ phone: citizenPhone, text: "1" })
            expect(r3.reply.step).toBe("AWAITING_RESOLVED")
            expect(sessionDb()?.currentQuestionId).toBe("10")

            const r4 = await statefulFlow({ phone: citizenPhone, text: "2" })
            expect(r4.reply.step).toBe("AWAITING_SCHEDULE_OFFER")
            expect(sessionDb()?.currentQuestionId).toBe("10")

            const r5 = await statefulFlow({ phone: citizenPhone, text: "1" })
            expect(r5.reply.step).toBe("AWAITING_ATTENDEE")
            expect(sessionDb()?.currentQuestionId).toBe("10")

            const r6 = await statefulFlow({ phone: citizenPhone, optionId: "attendee_self" })
            expect(r6.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(sessionDb()?.currentQuestionId).toBe("10")
            expect(sessionDb()?.draft?.by_representative).toBe(false)

            const r7 = await statefulFlow({ phone: citizenPhone, text: "Maria da Silva" })
            expect(r7.reply.step).toBe("AWAITING_HOLDER_CPF")
            expect(sessionDb()?.currentQuestionId).toBe("10")
            expect(sessionDb()?.draft?.holder_name).toBe("Maria da Silva")

            const r8 = await statefulFlow({ phone: citizenPhone, text: "529.982.247-25" })
            expect(r8.reply.step).toBe("AWAITING_SLOT")
            expect(sessionDb()?.currentQuestionId).toBe("10")
            expect(sessionDb()?.draft?.cpf_masked).toBe("***.982.247-**")

            const r9 = await statefulFlow({ phone: citizenPhone, optionId: slotOptionId(mockSlots[0]!) })
            expect(r9.reply.step).toBe("FINISHED")
            expect(r9.reply.text).toContain("Agendamento realizado")
            expect(bookSlot).toHaveBeenCalledWith(expect.objectContaining({
                sessionId: "sess_full_1",
                questionId: 10,
                name: "Maria da Silva",
                byRepresentative: false,
                phone: citizenPhone,
            }))
        })
    })
})
