import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import DuplicateAppointmentError from "../errors/DuplicateAppointmentError"
import SlotFullError from "../errors/SlotFullError"
import type { ActiveSession } from "../repositories/session.repository"
import type { ConversationEvent, RecordedConversationEvent } from "../types/conversationEvent.types"
import {
    ERRO_ATTENDEE,
    ERRO_CPF,
    ERRO_DUPLICATE_APPOINTMENT,
    ERRO_FALHA_AGENDAMENTO,
    ERRO_NOME,
    ERRO_SLOT_OCUPADO,
    ERRO_SLOTS,
    formatarListaSlots,
    MENSAGEM_RASCUNHO_INCOMPLETO,
    MENSAGEM_SEM_HORARIOS,
    PROMPT_CPF,
    PROMPT_NOME,
} from "./messageFormatter.service"
import {
    buildActiveSession,
    buildBookingDraft,
    mockBookResult,
    mockSlots,
    respostaPadrao,
    respostaPresencial,
    slotOptionId,
} from "./mock/conversationFlow.fixtures"
import { createConversationFlowHarness } from "./mock/conversationFlowHarness"

describe("conversationFlow.service", () => {
    const {
        findOrCreateActive,
        updateNavigationState,
        recordEvent,
        finishEvent,
        listEvents,
        logger,
        processarPergunta,
        getAvailableSlots,
        bookSlot,
        processIncomingMessage,
    } = createConversationFlowHarness()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    function sessionAt(currentStep: ActiveSession["currentStep"], overrides: Partial<ActiveSession> = {}) {
        return buildActiveSession({ currentStep, currentCategoryId: "1", currentQuestionId: "10", ...overrides })
    }

    describe("Fluxo de Agendamento Presencial (#56)", () => {
        test("AWAITING_ATTENDEE: opção interativa attendee_self grava ATTENDEE_CHOSEN (false) e avança para AWAITING_HOLDER_NAME", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_ATTENDEE"))

            const result = await processIncomingMessage({ phone: "5511999999999", optionId: "attendee_self" })

            expect(recordEvent).toHaveBeenCalledWith("s1", {
                type: "ATTENDEE_CHOSEN",
                byRepresentative: false,
            })
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_HOLDER_NAME",
                currentCategoryId: null,
                currentQuestionId: "10",
                draft: { by_representative: false },
            })
            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(PROMPT_NOME)
        })

        test("AWAITING_ATTENDEE: opção interativa attendee_rep grava ATTENDEE_CHOSEN (true) e avança para AWAITING_HOLDER_NAME", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_ATTENDEE"))

            const result = await processIncomingMessage({ phone: "5511999999999", optionId: "attendee_rep" })

            expect(recordEvent).toHaveBeenCalledWith("s1", {
                type: "ATTENDEE_CHOSEN",
                byRepresentative: true,
            })
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_HOLDER_NAME",
                currentCategoryId: null,
                currentQuestionId: "10",
                draft: { by_representative: true },
            })
            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(PROMPT_NOME)
        })

        test("AWAITING_ATTENDEE: texto livre é rejeitado e re-solicita escolha com botões", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_ATTENDEE"))

            const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

            expect(result.reply.step).toBe("AWAITING_ATTENDEE")
            expect(result.reply.text).toBe(ERRO_ATTENDEE)
            expect(result.reply.messages?.[0]?.type).toBe("buttons")
        })

        test("AWAITING_ATTENDEE: opção inválida re-solicita escolha com botões", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_ATTENDEE"))

            const result = await processIncomingMessage({ phone: "5511999999999", optionId: "invalido" })

            expect(result.reply.step).toBe("AWAITING_ATTENDEE")
            expect(result.reply.text).toBe(ERRO_ATTENDEE)
            expect(result.reply.messages?.[0]?.type).toBe("buttons")
        })

        test("AWAITING_HOLDER_NAME: nome válido salva draft e avança para AWAITING_HOLDER_CPF preservando currentQuestionId", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_HOLDER_NAME", { draft: { by_representative: false } }),
            )

            const result = await processIncomingMessage({ phone: "5511999999999", text: "Maria da Silva" })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_HOLDER_CPF",
                currentCategoryId: null,
                currentQuestionId: "10",
                draft: {
                    by_representative: false,
                    holder_name: "Maria da Silva",
                },
            })
            expect(result.reply.step).toBe("AWAITING_HOLDER_CPF")
            expect(result.reply.text).toBe(PROMPT_CPF)
        })

        test("AWAITING_HOLDER_NAME: nome inválido (vazio ou 1 caractere) re-solicita nome", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_HOLDER_NAME", { draft: { by_representative: false } }),
            )

            const result = await processIncomingMessage({ phone: "5511999999999", text: "A" })

            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(ERRO_NOME)
        })

        test("AWAITING_HOLDER_NAME: nome com dígitos é recusado para proteger CPF", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_HOLDER_NAME", { draft: { by_representative: false } }),
            )

            const result = await processIncomingMessage({ phone: "5511999999999", text: "Maria 529.982.247-25" })

            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(ERRO_NOME)
            expect(updateNavigationState).not.toHaveBeenCalled()
        })

        test.each([
            { caso: "Maria da Silva", nome: "Maria da Silva", gravado: "Maria da Silva" },
            { caso: "José em NFC", nome: "Jos\u00e9", gravado: "Jos\u00e9" },
            { caso: "José em NFD", nome: "Jose\u0301", gravado: "Jos\u00e9" },
            { caso: "D'Ávila", nome: "D'Ávila", gravado: "D'Ávila" },
            { caso: "D’Ávila", nome: "D’Ávila", gravado: "D’Ávila" },
            { caso: "Ana-Maria", nome: "Ana-Maria", gravado: "Ana-Maria" },
            { caso: "João Pedro Jr.", nome: "João Pedro Jr.", gravado: "João Pedro Jr." },
            { caso: "Müller", nome: "Müller", gravado: "Müller" },
            { caso: "李小龍", nome: "李小龍", gravado: "李小龍" },
            { caso: "Silva, João", nome: "Silva, João", gravado: "Silva, João" },
            { caso: "Maria ª", nome: "Maria ª", gravado: "Maria ª" },
            { caso: "Antônio º", nome: "Antônio º", gravado: "Antônio º" },
            { caso: "www.site.com", nome: "www.site.com", gravado: "www.site.com" },
        ])("AWAITING_HOLDER_NAME: aceita o nome $caso e grava a forma normalizada", async ({ nome, gravado }) => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_HOLDER_NAME", { draft: { by_representative: false } }),
            )

            const result = await processIncomingMessage({ phone: "5511999999999", text: nome })

            expect(result.reply.step).toBe("AWAITING_HOLDER_CPF")
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_HOLDER_CPF",
                currentCategoryId: null,
                currentQuestionId: "10",
                draft: {
                    by_representative: false,
                    holder_name: gravado,
                },
            })
        })

        test.each([
            { caso: "com CPF", nome: "Maria 529.982.247-25" },
            { caso: "com dígito e ordinal", nome: "Maria 2ª" },
            { caso: "com dígitos de largura total", nome: "Maria ５２９" },
            { caso: "com endereço eletrônico", nome: "maria@email.com" },
            { caso: "com emoji", nome: "João 😀" },
            { caso: "com sublinhado", nome: "Maria_Silva" },
            { caso: "com parênteses", nome: "Maria (Mary)" },
            { caso: "com barra", nome: "João/Maria" },
            { caso: "com e comercial", nome: "Maria & João" },
            { caso: "com menos de 2 caracteres", nome: "A" },
            { caso: "com mais de 150 caracteres", nome: "A".repeat(151) },
            { caso: "só com pontos", nome: ".." },
            { caso: "só com hífens e espaço", nome: "- -" },
            { caso: "só com vírgula, espaço e ponto", nome: ", ." },
            { caso: "só com apóstrofos", nome: "''" },
            { caso: "com quebra de linha", nome: "Maria\nSilva" },
            { caso: "com tabulação", nome: "Maria\tSilva" },
        ])("AWAITING_HOLDER_NAME: recusa o nome $caso e pede de novo", async ({ nome }) => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_HOLDER_NAME", { draft: { by_representative: false } }),
            )

            const result = await processIncomingMessage({ phone: "5511999999999", text: nome })

            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(ERRO_NOME)
            expect(updateNavigationState).not.toHaveBeenCalled()
        })

        test("AWAITING_HOLDER_CPF: CPF inválido re-solicita CPF", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_HOLDER_CPF", {
                    draft: { by_representative: false, holder_name: "Maria da Silva" },
                }),
            )

            const result = await processIncomingMessage({ phone: "5511999999999", text: "123.456.789-00" })

            expect(result.reply.step).toBe("AWAITING_HOLDER_CPF")
            expect(result.reply.text).toBe(ERRO_CPF)
        })

        test("AWAITING_HOLDER_CPF: CPF válido com horários avança para AWAITING_SLOT sem gravar PHONE_NOTICE_SHOWN antes da reserva", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_HOLDER_CPF", {
                    draft: { by_representative: false, holder_name: "Maria da Silva" },
                }),
            )
            getAvailableSlots.mockResolvedValueOnce(mockSlots)

            const result = await processIncomingMessage({ phone: "5511999999999", text: "529.982.247-25" })

            expect(recordEvent).not.toHaveBeenCalledWith("s1", {
                type: "PHONE_NOTICE_SHOWN",
            })
            expect(updateNavigationState).toHaveBeenCalledWith("s1", expect.objectContaining({
                currentStep: "AWAITING_SLOT",
                currentCategoryId: null,
                currentQuestionId: "10",
                listPage: 1,
                draft: expect.objectContaining({
                    holder_name: "Maria da Silva",
                    cpf_masked: "***.982.247-**",
                }),
            }))
            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toEqual(formatarListaSlots(mockSlots, 1))
            expect(result.reply.messages).toBeDefined()
        })

        test("AWAITING_HOLDER_CPF: CPF válido mas sem horários disponíveis encerra com NO_SLOT", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_HOLDER_CPF", {
                    draft: { by_representative: false, holder_name: "Maria da Silva" },
                }),
            )
            getAvailableSlots.mockResolvedValueOnce([])

            const result = await processIncomingMessage({ phone: "5511999999999", text: "52998224725" })

            expect(finishEvent).toHaveBeenCalledWith("s1", {
                outcome: "NO_SLOT",
                event: { type: "NO_SLOT" },
            })
            expect(result.reply.step).toBe("FINISHED")
            expect(result.reply.text).toBe(MENSAGEM_SEM_HORARIOS)
        })

        test("AWAITING_SLOT: escolhe slot válido por optionId realiza agendamento e retorna confirmação", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { draft: buildBookingDraft() }))
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockResolvedValueOnce(mockBookResult)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: slotOptionId(mockSlots[0]!),
            })

            expect(bookSlot).toHaveBeenCalledWith(expect.objectContaining({
                sessionId: "s1",
                questionId: 10,
                name: "Maria da Silva",
                cpfHash: "a".repeat(64),
                cpfMasked: "***.982.247-**",
                phone: "5511999999999",
                byRepresentative: false,
                appointmentDatetime: mockSlots[0]?.datetime,
            }))

            expect(result.reply.step).toBe("FINISHED")
            expect(result.reply.text).toContain("Agendamento realizado")
            expect(result.reply.text).toContain("Protocolo: A3F9C21B")
            expect(result.reply.text).toContain("Data e hora: Terça-feira, 06/10 às 08:00")
            expect(result.reply.text).toContain("Leve ao atendimento:")
        })

        test("AWAITING_SLOT: texto livre é rejeitado e re-solicita seleção pela lista", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { draft: buildBookingDraft() }))
            getAvailableSlots.mockResolvedValueOnce(mockSlots)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                text: "1",
            })

            expect(bookSlot).not.toHaveBeenCalled()
            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toContain(ERRO_SLOTS)
        })

        test("AWAITING_SLOT: draft incompleto reinicia em AWAITING_ATTENDEE com mensagem amigável", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_SLOT", { draft: buildBookingDraft({ holder_name: undefined }) }),
            )
            getAvailableSlots.mockResolvedValueOnce(mockSlots)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: slotOptionId(mockSlots[0]!),
            })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_ATTENDEE",
                currentCategoryId: null,
                currentQuestionId: "10",
                draft: null,
            })
            expect(result.reply.step).toBe("AWAITING_ATTENDEE")
            expect(result.reply.text).toBe(MENSAGEM_RASCUNHO_INCOMPLETO)
        })

        test("AWAITING_SLOT: conflito de concorrência (SlotFullError) avisa e recarrega horários na página 1 atualizando estado", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_SLOT", { listPage: 2, draft: buildBookingDraft() }),
            )
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockRejectedValueOnce(new SlotFullError())
            const remainingSlot = [mockSlots[1]!]
            getAvailableSlots.mockResolvedValueOnce(remainingSlot)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: slotOptionId(mockSlots[0]!),
            })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_SLOT",
                currentCategoryId: null,
                currentQuestionId: "10",
                listPage: 1,
            })
            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toContain(ERRO_SLOT_OCUPADO)
            expect(result.reply.text).toContain("1. Terça-feira, 06/10 às 08:30")
        })

        test("AWAITING_SLOT: conflito de horário duplicado (DuplicateAppointmentError) avisa cidadão", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { draft: buildBookingDraft() }))
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockRejectedValueOnce(new DuplicateAppointmentError())

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: slotOptionId(mockSlots[0]!),
            })

            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toContain(ERRO_DUPLICATE_APPOINTMENT)
        })

        test("AWAITING_SLOT: falha inesperada na reserva avisa o cidadão que o agendamento não foi gravado", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { draft: buildBookingDraft() }))
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockRejectedValueOnce(new Error("Database connection lost"))

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: slotOptionId(mockSlots[0]!),
            })

            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toBe(ERRO_FALHA_AGENDAMENTO)
            expect(logger.error).toHaveBeenCalledWith("Failed to book appointment", expect.any(Object))
        })
    })

    describe("Motivo do agendamento vindo da oferta registrada", () => {
        const offeredAt = new Date("2026-10-05T12:00:00.000Z").getTime()

        function recordedEvents(...events: ConversationEvent[]): RecordedConversationEvent[] {
            return events.map((event, index) => ({ ...event, createdAt: new Date(offeredAt + index * 1000) }))
        }

        afterEach(() => {
            processarPergunta.mockReset()
            listEvents.mockReset()
        })

        test("usa o motivo do SCHEDULE_OFFERED mesmo se a pergunta deixou de exigir presencial", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { draft: buildBookingDraft() }))
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            listEvents.mockResolvedValueOnce(
                recordedEvents(
                    { type: "QUESTION_CHOSEN", categoryId: 1, questionId: 10 },
                    { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" },
                ),
            )
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockResolvedValueOnce(mockBookResult)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: slotOptionId(mockSlots[0]!),
            })

            expect(listEvents).toHaveBeenCalledWith("s1")
            expect(bookSlot).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "s1", reason: "REQUIRES_IN_PERSON" }))
            expect(processarPergunta).not.toHaveBeenCalled()
            expect(result.reply.step).toBe("FINISHED")
        })

        test("usa NOT_RESOLVED oferecido mesmo se a pergunta passou a exigir presencial", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { draft: buildBookingDraft() }))
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            listEvents.mockResolvedValueOnce(
                recordedEvents(
                    { type: "QUESTION_CHOSEN", categoryId: 1, questionId: 10 },
                    { type: "RESOLVED_ANSWERED", resolved: false },
                    { type: "SCHEDULE_OFFERED", reason: "NOT_RESOLVED" },
                ),
            )
            processarPergunta.mockResolvedValueOnce(respostaPresencial)
            bookSlot.mockResolvedValueOnce(mockBookResult)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: slotOptionId(mockSlots[0]!),
            })

            expect(bookSlot).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "s1", reason: "NOT_RESOLVED" }))
            expect(processarPergunta).not.toHaveBeenCalled()
            expect(result.reply.step).toBe("FINISHED")
        })

        test("sem SCHEDULE_OFFERED depois da pergunta, recalcula o motivo pela pergunta", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { draft: buildBookingDraft() }))
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            listEvents.mockResolvedValueOnce(
                recordedEvents(
                    { type: "QUESTION_CHOSEN", categoryId: 1, questionId: 10 },
                    { type: "ANSWER_SENT", categoryId: 1, questionId: 10, llm: "NOT_CALLED" },
                ),
            )
            processarPergunta.mockResolvedValueOnce(respostaPresencial)
            bookSlot.mockResolvedValueOnce(mockBookResult)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: slotOptionId(mockSlots[0]!),
            })

            expect(processarPergunta).toHaveBeenCalledWith(10)
            expect(bookSlot).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "s1", reason: "REQUIRES_IN_PERSON" }))
            expect(logger.error).not.toHaveBeenCalled()
            expect(result.reply.step).toBe("FINISHED")
        })

        test("falha na leitura dos eventos recalcula o motivo, conclui a reserva e registra só o código", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_SLOT", { id: "123", draft: buildBookingDraft() }),
            )
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            listEvents.mockRejectedValueOnce(Object.assign(new Error("connection terminated"), { code: "57P01" }))
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockResolvedValueOnce(mockBookResult)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: slotOptionId(mockSlots[0]!),
            })

            expect(processarPergunta).toHaveBeenCalledWith(10)
            expect(bookSlot).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "123", reason: "NOT_RESOLVED" }))
            expect(result.reply.step).toBe("FINISHED")
            expect(logger.error).toHaveBeenCalledTimes(1)
            expect(logger.error).toHaveBeenCalledWith("Failed to read schedule offer reason", {
                type: "SCHEDULE_OFFERED",
                sessionId: "123",
                code: "57P01",
            })
        })

        test.each([
            { failure: "SlotFullError", error: new SlotFullError(), slotListsOnFirstClick: 2 },
            { failure: "DuplicateAppointmentError", error: new DuplicateAppointmentError(), slotListsOnFirstClick: 1 },
        ])(
            "depois de $failure, o novo clique lê a oferta de novo e reserva com o mesmo motivo",
            async ({ error, slotListsOnFirstClick }) => {
                const offer = recordedEvents(
                    { type: "QUESTION_CHOSEN", categoryId: 1, questionId: 10 },
                    { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" },
                )
                findOrCreateActive
                    .mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { draft: buildBookingDraft() }))
                    .mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { listPage: 1, draft: buildBookingDraft() }))
                for (let index = 0; index < slotListsOnFirstClick + 1; index++) {
                    getAvailableSlots.mockResolvedValueOnce(mockSlots)
                }
                listEvents.mockResolvedValueOnce(offer).mockResolvedValueOnce(offer)
                processarPergunta.mockResolvedValue(respostaPadrao)
                bookSlot.mockRejectedValueOnce(error).mockResolvedValueOnce(mockBookResult)

                const firstClick = await processIncomingMessage({
                    phone: "5511999999999",
                    optionId: slotOptionId(mockSlots[0]!),
                })
                const secondClick = await processIncomingMessage({
                    phone: "5511999999999",
                    optionId: slotOptionId(mockSlots[1]!),
                })

                expect(firstClick.reply.step).toBe("AWAITING_SLOT")
                expect(secondClick.reply.step).toBe("FINISHED")
                expect(listEvents).toHaveBeenCalledTimes(2)
                expect(listEvents).toHaveBeenNthCalledWith(1, "s1")
                expect(listEvents).toHaveBeenNthCalledWith(2, "s1")
                expect(bookSlot).toHaveBeenCalledTimes(2)
                expect(bookSlot).toHaveBeenNthCalledWith(1, expect.objectContaining({ sessionId: "s1", reason: "REQUIRES_IN_PERSON" }))
                expect(bookSlot).toHaveBeenNthCalledWith(2, expect.objectContaining({ sessionId: "s1", reason: "REQUIRES_IN_PERSON" }))
                expect(processarPergunta).not.toHaveBeenCalled()
                expect(getAvailableSlots).toHaveBeenCalledTimes(slotListsOnFirstClick + 1)
            },
        )

        test("rascunho incompleto volta para AWAITING_ATTENDEE sem ler os eventos da conversa", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_SLOT", { draft: buildBookingDraft({ cpf_hash: undefined }) }),
            )
            getAvailableSlots.mockResolvedValueOnce(mockSlots)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: slotOptionId(mockSlots[0]!),
            })

            expect(listEvents).not.toHaveBeenCalled()
            expect(processarPergunta).not.toHaveBeenCalled()
            expect(bookSlot).not.toHaveBeenCalled()
            expect(updateNavigationState).toHaveBeenCalledWith("s1", expect.objectContaining({ draft: null }))
            expect(result.reply.step).toBe("AWAITING_ATTENDEE")
        })
    })
})
