import { beforeEach, describe, expect, test, vi } from "vitest"
import AppointmentNotChangeableError from "../errors/AppointmentNotChangeableError"
import DuplicateAppointmentError from "../errors/DuplicateAppointmentError"
import SlotFullError from "../errors/SlotFullError"
import type { ActiveSession } from "../repositories/session.repository"
import type { AvailableSlot, CitizenRescheduleResult } from "../types/schedule.types"
import {
    AGENDAMENTO_NAO_ALTERAVEL,
    criarBotoesRetorno,
    criarMensagensCategorias,
    criarMensagensSlots,
    ERRO_DUPLICATE_APPOINTMENT,
    ERRO_FALHA_ALTERACAO,
    ERRO_SLOT_OCUPADO,
    formatarConfirmacaoAgendamento,
    formatarErroSlot,
    formatarListaCategorias,
    formatarListaSlots,
    MENSAGEM_RASCUNHO_INCOMPLETO,
    MENU_RETORNO,
    RODAPE_RETORNO,
    SEM_HORARIOS_REMARCACAO,
} from "./messageFormatter.service"
import {
    buildActiveSession,
    buildReturningAppointment,
    categorias,
    mockSlots,
    slotOptionId,
} from "./mock/conversationFlow.fixtures"
import { createConversationFlowHarness } from "./mock/conversationFlowHarness"

const PHONE = "5512999990000"
const QUANDO = "06/10 às 08:00"
const target = { target_appointment_id: 7 }

const currentSlot = mockSlots[0]!
const otherSlot = mockSlots[1]!
const thirdSlot: AvailableSlot = {
    datetime: new Date("2026-10-07T09:00:00-03:00"),
    dateStr: "2026-10-07",
    timeStr: "09:00",
    formatted: "Quarta-feira, 07/10 às 09:00",
    remainingSeats: 2,
}
const freeSlots = [currentSlot, otherSlot, thirdSlot]
const manySlots: AvailableSlot[] = Array.from({ length: 12 }, (_, index) => ({
    datetime: new Date(Date.UTC(2026, 9, 8, 11 + Math.floor(index / 2), (index % 2) * 30)),
    dateStr: "2026-10-08",
    timeStr: `${String(8 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}`,
    formatted: `Quinta-feira, 08/10 às ${String(8 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}`,
    remainingSeats: 1,
}))
const slotsWithoutCurrent = [otherSlot, thirdSlot]

const rescheduled: CitizenRescheduleResult = {
    protocol: "AB12CD34",
    from: currentSlot.datetime,
    appointmentDatetime: otherSlot.datetime,
    unitAddress: "Rua do Procon, 100",
    unitAddressComplement: "Sala 2",
    documentsSent: { group: ["Procuração"], question: ["Contrato"] },
    byRepresentative: true,
    reminderEnabled: true,
    reminderHours: 2,
}

describe("conversationFlow.service: remarcação pelo cidadão (#59)", () => {
    const {
        findOrCreateActive,
        updateNavigationState,
        recordEvent,
        finishEvent,
        logger,
        iniciarSessao,
        getAvailableSlots,
        bookSlot,
        findReturningAppointment,
        rescheduleByCitizen,
        processIncomingMessage,
    } = createConversationFlowHarness()

    beforeEach(() => {
        vi.clearAllMocks()
        findReturningAppointment.mockReset()
        rescheduleByCitizen.mockReset()
        getAvailableSlots.mockReset()
        iniciarSessao.mockResolvedValue(categorias)
        findReturningAppointment.mockResolvedValue(
            buildReturningAppointment({ appointmentDatetime: currentSlot.datetime }),
        )
        getAvailableSlots.mockResolvedValue(freeSlots)
    })

    function sessionAt(currentStep: ActiveSession["currentStep"], overrides: Partial<ActiveSession> = {}) {
        return buildActiveSession({ currentStep, draft: target, ...overrides })
    }

    function slotTakenReply(slots: AvailableSlot[]) {
        return {
            text: `${ERRO_SLOT_OCUPADO}\n${formatarListaSlots(slots, 1)}`,
            step: "AWAITING_SLOT",
            messages: [{ type: "text", text: ERRO_SLOT_OCUPADO }, ...criarMensagensSlots(slots, 1)],
        }
    }

    function noSlotReply() {
        return {
            text: `${SEM_HORARIOS_REMARCACAO(QUANDO)}\n${MENU_RETORNO(QUANDO)}`,
            step: "AWAITING_RETURN_CHOICE",
            messages: [
                { type: "text", text: SEM_HORARIOS_REMARCACAO(QUANDO) },
                {
                    type: "buttons",
                    text: `Você tem atendimento marcado em ${QUANDO}.`,
                    footer: RODAPE_RETORNO,
                    buttons: criarBotoesRetorno(),
                },
            ],
        }
    }

    describe("Remarcar no menu de retorno", () => {
        test("avisa que não há outro horário e volta ao menu, sem encerrar, quando o horário atual é o único livre", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_RETURN_CHOICE"))
            getAvailableSlots.mockResolvedValueOnce([currentSlot])

            const result = await processIncomingMessage({ phone: PHONE, optionId: "return_reschedule" })

            expect(result.reply).toEqual(noSlotReply())
            expect(finishEvent).not.toHaveBeenCalled()
            expect(recordEvent).not.toHaveBeenCalledWith("s1", { type: "NO_SLOT" })
        })

        test.each([
            ["o botão Remarcar", { optionId: "return_reschedule" }],
            ["o texto 1", { text: "1" }],
        ])("oferece os horários livres sem o horário atual, mantendo o rascunho, com %s", async (_caso, input) => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_RETURN_CHOICE"))

            const result = await processIncomingMessage({ phone: PHONE, ...input })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_SLOT",
                currentCategoryId: null,
                currentQuestionId: null,
                listPage: 1,
            })
            expect(updateNavigationState.mock.calls[0]?.[1]).not.toHaveProperty("draft")
            expect(result.reply).toEqual({
                text: formatarListaSlots(slotsWithoutCurrent, 1),
                step: "AWAITING_SLOT",
                messages: criarMensagensSlots(slotsWithoutCurrent, 1),
            })
        })
    })

    describe("escolha do horário", () => {
        test("trata o horário pelo ramo da remarcação quando o rascunho só tem o alvo, sem cair no rascunho incompleto", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT"))
            rescheduleByCitizen.mockResolvedValueOnce(rescheduled)

            const result = await processIncomingMessage({ phone: PHONE, optionId: slotOptionId(otherSlot) })

            expect(result.reply.text).not.toBe(MENSAGEM_RASCUNHO_INCOMPLETO)
            expect(result.reply.step).not.toBe("AWAITING_ATTENDEE")
            expect(updateNavigationState).not.toHaveBeenCalledWith("s1", expect.objectContaining({ currentStep: "AWAITING_ATTENDEE" }))
            expect(bookSlot).not.toHaveBeenCalled()
        })

        test("responde horário ocupado com a lista sem ele quando o cidadão escolhe o próprio horário atual", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { listPage: 1 }))

            const result = await processIncomingMessage({ phone: PHONE, optionId: slotOptionId(currentSlot) })

            expect(result.reply).toEqual(slotTakenReply(slotsWithoutCurrent))
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_SLOT",
                currentCategoryId: null,
                currentQuestionId: null,
                listPage: 1,
            })
            expect(rescheduleByCitizen).not.toHaveBeenCalled()
        })

        test("pagina a lista sem o horário atual e mantém o rascunho", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { listPage: 1 }))
            getAvailableSlots.mockResolvedValueOnce([currentSlot, ...manySlots])

            const result = await processIncomingMessage({ phone: PHONE, optionId: "page_2" })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_SLOT",
                currentCategoryId: null,
                currentQuestionId: null,
                listPage: 2,
            })
            expect(updateNavigationState.mock.calls[0]?.[1]).not.toHaveProperty("draft")
            expect(result.reply).toEqual({
                text: formatarListaSlots(manySlots, 2),
                step: "AWAITING_SLOT",
                messages: criarMensagensSlots(manySlots, 2),
            })
        })

        test("responde o erro da lista sem o horário atual quando chega texto livre", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { listPage: 1 }))

            const result = await processIncomingMessage({ phone: PHONE, text: "amanhã" })

            expect(result.reply).toEqual({
                text: formatarErroSlot(slotsWithoutCurrent, 1),
                step: "AWAITING_SLOT",
                messages: criarMensagensSlots(slotsWithoutCurrent, 1),
            })
            expect(updateNavigationState).not.toHaveBeenCalled()
        })

        test("remarca para o horário escolhido e responde a confirmação com o título Agendamento remarcado", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { listPage: 1 }))
            rescheduleByCitizen.mockResolvedValueOnce(rescheduled)

            const result = await processIncomingMessage({ phone: PHONE, optionId: slotOptionId(otherSlot) })

            expect(rescheduleByCitizen).toHaveBeenCalledWith({
                sessionId: "s1",
                appointmentId: 7,
                phoneHash: `hash-${PHONE}`,
                appointmentDatetime: otherSlot.datetime,
            })
            const confirmation = formatarConfirmacaoAgendamento({
                titulo: "Agendamento remarcado",
                protocol: "AB12CD34",
                quando: otherSlot.formatted,
                unitAddress: "Rua do Procon, 100",
                unitAddressComplement: "Sala 2",
                byRepresentative: true,
                groupDocuments: ["Procuração"],
                questionDocuments: ["Contrato"],
                reminderEnabled: true,
                reminderHours: 2,
            })
            expect(result).toEqual({
                sessionId: "s1",
                newSession: false,
                reply: { text: confirmation, step: "FINISHED", messages: [{ type: "text", text: confirmation }] },
            })
            expect(confirmation.split("\n")[0]).toBe("Agendamento remarcado")
            expect(updateNavigationState).not.toHaveBeenCalled()
        })

        test("responde horário ocupado com a lista atualizada sem o horário atual quando o horário lota antes do clique", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { listPage: 1 }))
            getAvailableSlots.mockResolvedValueOnce(freeSlots).mockResolvedValueOnce([currentSlot, thirdSlot])
            rescheduleByCitizen.mockRejectedValueOnce(new SlotFullError())

            const result = await processIncomingMessage({ phone: PHONE, optionId: slotOptionId(otherSlot) })

            expect(result.reply).toEqual(slotTakenReply([thirdSlot]))
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_SLOT",
                currentCategoryId: null,
                currentQuestionId: null,
                listPage: 1,
            })
        })

        test("avisa que não há outro horário e volta ao menu quando a lista atualizada fica vazia depois do horário lotar", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { listPage: 1 }))
            getAvailableSlots.mockResolvedValueOnce(freeSlots).mockResolvedValueOnce([currentSlot])
            rescheduleByCitizen.mockRejectedValueOnce(new SlotFullError())

            const result = await processIncomingMessage({ phone: PHONE, optionId: slotOptionId(otherSlot) })

            expect(result.reply).toEqual(noSlotReply())
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_RETURN_CHOICE",
                currentCategoryId: null,
                currentQuestionId: null,
                listPage: 1,
            })
            expect(finishEvent).not.toHaveBeenCalled()
        })

        test("responde o aviso de agendamento duplicado com a mesma lista e mantém a etapa", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { listPage: 1 }))
            rescheduleByCitizen.mockRejectedValueOnce(new DuplicateAppointmentError())

            const result = await processIncomingMessage({ phone: PHONE, optionId: slotOptionId(otherSlot) })

            expect(result.reply).toEqual({
                text: `${ERRO_DUPLICATE_APPOINTMENT}\n${formatarListaSlots(slotsWithoutCurrent, 1)}`,
                step: "AWAITING_SLOT",
                messages: [
                    { type: "text", text: ERRO_DUPLICATE_APPOINTMENT },
                    ...criarMensagensSlots(slotsWithoutCurrent, 1),
                ],
            })
            expect(updateNavigationState).not.toHaveBeenCalled()
        })

        test.each([
            ["a remarcação é recusada na transação", "transação"],
            ["o alvo não volta mais como agendamento de retorno", "consulta"],
        ])("avisa que o agendamento não pode mais ser alterado e mostra as categorias sem o alvo quando %s", async (_caso, origem) => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { listPage: 1 }))
            if (origem === "consulta") {
                findReturningAppointment.mockResolvedValueOnce(null)
            } else {
                rescheduleByCitizen.mockRejectedValueOnce(new AppointmentNotChangeableError())
            }

            const result = await processIncomingMessage({ phone: PHONE, optionId: slotOptionId(otherSlot) })

            expect(result.reply).toEqual({
                text: `${AGENDAMENTO_NAO_ALTERAVEL}\n${formatarListaCategorias(categorias, 1)}`,
                step: "AWAITING_CATEGORY",
                messages: [{ type: "text", text: AGENDAMENTO_NAO_ALTERAVEL }, ...criarMensagensCategorias(categorias, 1)],
            })
            expect(updateNavigationState).toHaveBeenLastCalledWith("s1", {
                currentStep: "AWAITING_CATEGORY",
                currentCategoryId: null,
                currentQuestionId: null,
                listPage: 1,
                draft: null,
            })
        })

        test("registra a falha inesperada da remarcação no log, avisa a instabilidade e mantém a etapa", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { id: "42", listPage: 1 }))
            rescheduleByCitizen.mockRejectedValueOnce(Object.assign(new Error("db down"), { code: "ECONNRESET" }))

            const result = await processIncomingMessage({ phone: PHONE, optionId: slotOptionId(otherSlot) })

            expect(logger.error).toHaveBeenCalledWith("Failed to change appointment", {
                type: "APPOINTMENT_RESCHEDULED",
                sessionId: "42",
                code: "ECONNRESET",
            })
            expect(result.reply).toEqual({
                text: ERRO_FALHA_ALTERACAO,
                step: "AWAITING_SLOT",
                messages: [{ type: "text", text: ERRO_FALHA_ALTERACAO }],
            })
            expect(updateNavigationState).not.toHaveBeenCalled()
        })

        test.each([
            ["da reconferência do agendamento", "consulta"],
            ["da leitura dos horários livres", "horarios"],
        ])("registra no log a falha %s no clique do horário, avisa a instabilidade e mantém a etapa", async (_caso, origem) => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_SLOT", { id: "42", listPage: 1 }))
            const failure = Object.assign(new Error("db down"), { code: "ECONNREFUSED" })
            if (origem === "consulta") {
                findReturningAppointment.mockRejectedValueOnce(failure)
            } else {
                getAvailableSlots.mockRejectedValueOnce(failure)
            }

            const result = await processIncomingMessage({ phone: PHONE, optionId: slotOptionId(otherSlot) })

            expect(logger.error).toHaveBeenCalledWith("Failed to change appointment", {
                type: "APPOINTMENT_RESCHEDULED",
                sessionId: "42",
                code: "ECONNREFUSED",
            })
            expect(result.reply).toEqual({
                text: ERRO_FALHA_ALTERACAO,
                step: "AWAITING_SLOT",
                messages: [{ type: "text", text: ERRO_FALHA_ALTERACAO }],
            })
            expect(rescheduleByCitizen).not.toHaveBeenCalled()
            expect(updateNavigationState).not.toHaveBeenCalled()
        })
    })
})
