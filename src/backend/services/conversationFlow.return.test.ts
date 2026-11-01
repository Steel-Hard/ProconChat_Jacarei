import { beforeEach, describe, expect, test, vi } from "vitest"
import AppointmentNotChangeableError from "../errors/AppointmentNotChangeableError"
import type { ActiveSession } from "../repositories/session.repository"
import {
    AGENDAMENTO_NAO_ALTERAVEL,
    CONFIRMA_CANCELAMENTO,
    criarMensagensCategorias,
    ERRO_CONFIRMA_CANCELAMENTO,
    ERRO_FALHA_ALTERACAO,
    ERRO_MENU_RETORNO,
    formatarListaCategorias,
    RESPOSTA_CANCELADO,
    RODAPE_RETORNO,
} from "./messageFormatter.service"
import { buildActiveSession, buildReturningAppointment, categorias } from "./mock/conversationFlow.fixtures"
import { createConversationFlowHarness } from "./mock/conversationFlowHarness"

const PHONE = "5512999990000"
const QUANDO = "10/11 às 10:00"
const CANCEL_BUTTONS = [
    { id: "cancel_yes", title: "Sim, cancelar" },
    { id: "cancel_no", title: "Não, manter" },
]
const MENU_BUTTONS = [
    { id: "return_reschedule", title: "Remarcar" },
    { id: "return_cancel", title: "Cancelar" },
    { id: "return_other", title: "Tenho outra dúvida" },
]

describe("conversationFlow.service: retorno de quem já tem agendamento (#59)", () => {
    const {
        findOrCreateActive,
        updateNavigationState,
        recordEvent,
        logger,
        iniciarSessao,
        findReturningAppointment,
        finishEvent,
        getAvailableSlots,
        cancelByCitizen,
        rescheduleByCitizen,
        processIncomingMessage,
    } = createConversationFlowHarness()

    beforeEach(() => {
        vi.clearAllMocks()
        findReturningAppointment.mockReset()
        cancelByCitizen.mockReset()
        rescheduleByCitizen.mockReset()
        getAvailableSlots.mockReset()
        iniciarSessao.mockResolvedValue(categorias)
    })

    const target = { target_appointment_id: 7 }

    function notChangeableReply() {
        return {
            text: `${AGENDAMENTO_NAO_ALTERAVEL}\n${formatarListaCategorias(categorias, 1)}`,
            step: "AWAITING_CATEGORY",
            messages: [{ type: "text", text: AGENDAMENTO_NAO_ALTERAVEL }, ...criarMensagensCategorias(categorias, 1)],
        }
    }

    function expectCategoriesWithoutTarget() {
        expect(updateNavigationState).toHaveBeenLastCalledWith("s1", {
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            currentQuestionId: null,
            listPage: 1,
            draft: null,
        })
    }

    function sessionAt(currentStep: ActiveSession["currentStep"], overrides: Partial<ActiveSession> = {}) {
        return buildActiveSession({ currentStep, ...overrides })
    }

    describe("sessão nova", () => {
        test("não consulta o agendamento de retorno numa sessão que já estava em andamento", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_CATEGORY"))

            await processIncomingMessage({ phone: PHONE, text: "abc" })

            expect(findReturningAppointment).not.toHaveBeenCalled()
        })

        test("segue para a lista de categorias e não grava APPOINTMENT_CONSULTED quando não há agendamento de retorno", async () => {
            findOrCreateActive.mockResolvedValueOnce(buildActiveSession({ created: true }))
            findReturningAppointment.mockResolvedValueOnce(null)

            const result = await processIncomingMessage({ phone: PHONE, text: "oi" })

            expect(findReturningAppointment).toHaveBeenCalledWith(`hash-${PHONE}`)
            expect(recordEvent).not.toHaveBeenCalled()
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_CATEGORY",
                currentCategoryId: null,
                currentQuestionId: null,
                listPage: 1,
                draft: null,
            })
            expect(result).toEqual({
                sessionId: "s1",
                newSession: true,
                reply: {
                    text: formatarListaCategorias(categorias, 1),
                    step: "AWAITING_CATEGORY",
                    messages: criarMensagensCategorias(categorias, 1),
                },
            })
        })

        test("registra a falha da consulta no log e segue para a lista de categorias", async () => {
            findOrCreateActive.mockResolvedValueOnce(buildActiveSession({ id: "42", created: true }))
            findReturningAppointment.mockRejectedValueOnce(Object.assign(new Error("db down"), { code: "ECONNREFUSED" }))

            const result = await processIncomingMessage({ phone: PHONE, text: "oi" })

            expect(logger.error).toHaveBeenCalledWith("Failed to read returning appointment", {
                type: "APPOINTMENT_CONSULTED",
                sessionId: "42",
                code: "ECONNREFUSED",
            })
            expect(recordEvent).not.toHaveBeenCalled()
            expect(result.reply).toEqual({
                text: formatarListaCategorias(categorias, 1),
                step: "AWAITING_CATEGORY",
                messages: criarMensagensCategorias(categorias, 1),
            })
        })

        test("grava APPOINTMENT_CONSULTED, guarda o alvo no rascunho e responde com o menu de retorno e o rodapé", async () => {
            findOrCreateActive.mockResolvedValueOnce(buildActiveSession({ created: true }))
            findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment())

            const result = await processIncomingMessage({ phone: PHONE, text: "oi" })

            expect(recordEvent).toHaveBeenCalledWith("s1", { type: "APPOINTMENT_CONSULTED", appointmentId: 7 })
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_RETURN_CHOICE",
                currentCategoryId: null,
                currentQuestionId: null,
                listPage: 1,
                draft: { target_appointment_id: 7 },
            })
            expect(result).toEqual({
                sessionId: "s1",
                newSession: true,
                reply: {
                    text: `Você tem atendimento marcado em ${QUANDO}.\n1. Remarcar\n2. Cancelar\n3. Tenho outra dúvida`,
                    step: "AWAITING_RETURN_CHOICE",
                    messages: [
                        {
                            type: "buttons",
                            text: `Você tem atendimento marcado em ${QUANDO}.`,
                            footer: RODAPE_RETORNO,
                            buttons: MENU_BUTTONS,
                        },
                    ],
                },
            })
            expect(iniciarSessao).not.toHaveBeenCalled()
        })
    })

    describe("menu de retorno", () => {
        test.each([
            ["texto livre", { text: "oi" }],
            ["botão desconhecido", { optionId: "schedule_yes" }],
        ])("responde o erro do menu com os 3 botões, sem mudar de etapa nem gravar evento, para %s", async (_caso, input) => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_RETURN_CHOICE", { draft: target }))

            const result = await processIncomingMessage({ phone: PHONE, ...input })

            expect(result.reply).toEqual({
                text: ERRO_MENU_RETORNO,
                step: "AWAITING_RETURN_CHOICE",
                messages: [{ type: "buttons", text: ERRO_MENU_RETORNO, buttons: MENU_BUTTONS }],
            })
            expect(updateNavigationState).not.toHaveBeenCalled()
            expect(recordEvent).not.toHaveBeenCalled()
        })

        test.each([
            ["o botão Tenho outra dúvida", { optionId: "return_other" }],
            ["o texto 3", { text: "3" }],
        ])("vai para a lista de categorias sem o alvo e sem encerrar a sessão com %s", async (_caso, input) => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_RETURN_CHOICE", { draft: target }))

            const result = await processIncomingMessage({ phone: PHONE, ...input })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_CATEGORY",
                currentCategoryId: null,
                currentQuestionId: null,
                listPage: 1,
                draft: null,
            })
            expect(result).toEqual({
                sessionId: "s1",
                newSession: false,
                reply: {
                    text: formatarListaCategorias(categorias, 1),
                    step: "AWAITING_CATEGORY",
                    messages: criarMensagensCategorias(categorias, 1),
                },
            })
            expect(finishEvent).not.toHaveBeenCalled()
            expect(findReturningAppointment).not.toHaveBeenCalled()
            expect(getAvailableSlots).not.toHaveBeenCalled()
            expect(cancelByCitizen).not.toHaveBeenCalled()
            expect(rescheduleByCitizen).not.toHaveBeenCalled()
        })

        test.each([
            ["o botão Cancelar", { optionId: "return_cancel" }],
            ["o texto 2", { text: "2" }],
        ])("pede a confirmação do cancelamento mantendo o rascunho com %s", async (_caso, input) => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_RETURN_CHOICE", { draft: target }))
            findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment())

            const result = await processIncomingMessage({ phone: PHONE, ...input })

            expect(findReturningAppointment).toHaveBeenCalledWith(`hash-${PHONE}`)
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_CANCEL_CONFIRMATION",
                currentCategoryId: null,
                currentQuestionId: null,
            })
            expect(updateNavigationState.mock.calls[0]?.[1]).not.toHaveProperty("draft")
            expect(result.reply).toEqual({
                text: CONFIRMA_CANCELAMENTO(QUANDO),
                step: "AWAITING_CANCEL_CONFIRMATION",
                messages: [{ type: "buttons", text: CONFIRMA_CANCELAMENTO(QUANDO), buttons: CANCEL_BUTTONS }],
            })
        })

        test.each([
            ["não há mais agendamento de retorno", null],
            ["o agendamento de retorno agora é outro", buildReturningAppointment({ id: "8" })],
        ])("avisa que o agendamento não pode mais ser alterado e mostra as categorias quando %s", async (_caso, returning) => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_RETURN_CHOICE", { draft: target }))
            findReturningAppointment.mockResolvedValueOnce(returning)

            const result = await processIncomingMessage({ phone: PHONE, optionId: "return_cancel" })

            expect(result.reply).toEqual(notChangeableReply())
            expectCategoriesWithoutTarget()
        })

        test.each([
            ["texto", "abc"],
            ["zero", 0],
        ])("trata o alvo inválido no rascunho (%s) como agendamento que não pode mais ser alterado", async (_caso, invalid) => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_RETURN_CHOICE", { draft: { target_appointment_id: invalid } }),
            )
            findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment({ id: "0" }))

            const result = await processIncomingMessage({ phone: PHONE, optionId: "return_cancel" })

            expect(result.reply).toEqual(notChangeableReply())
            expect(cancelByCitizen).not.toHaveBeenCalled()
        })
    })

    describe("confirmação do cancelamento", () => {
        function errorReply() {
            return {
                text: ERRO_CONFIRMA_CANCELAMENTO,
                step: "AWAITING_CANCEL_CONFIRMATION",
                messages: [{ type: "buttons", text: ERRO_CONFIRMA_CANCELAMENTO, buttons: CANCEL_BUTTONS }],
            }
        }

        test("responde o erro da confirmação com os botões e mantém a etapa quando a resposta não é reconhecida", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_CANCEL_CONFIRMATION", { draft: target }))

            const result = await processIncomingMessage({ phone: PHONE, text: "talvez" })

            expect(result.reply).toEqual(errorReply())
            expect(updateNavigationState).not.toHaveBeenCalled()
        })

        test("não cancela com o texto quero reagendar e responde o erro da confirmação", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_CANCEL_CONFIRMATION", { draft: target }))

            const result = await processIncomingMessage({ phone: PHONE, text: "quero reagendar" })

            expect(result.reply).toEqual(errorReply())
            expect(cancelByCitizen).not.toHaveBeenCalled()
        })

        test("confirma o cancelamento com o texto sim, com espaços e maiúsculas", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_CANCEL_CONFIRMATION", { draft: target }))
            findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment())
            cancelByCitizen.mockResolvedValueOnce({ protocol: "AB12CD34" })

            const result = await processIncomingMessage({ phone: PHONE, text: " Sim " })

            expect(cancelByCitizen).toHaveBeenCalledOnce()
            expect(result.reply.text).toBe(RESPOSTA_CANCELADO("AB12CD34"))
        })

        test.each([
            ["o botão Não, manter", { optionId: "cancel_no" }],
            ["o texto 2", { text: "2" }],
        ])("volta ao menu de retorno sem cancelar com %s", async (_caso, input) => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_CANCEL_CONFIRMATION", { draft: target }))
            findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment())

            const result = await processIncomingMessage({ phone: PHONE, ...input })

            expect(cancelByCitizen).not.toHaveBeenCalled()
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_RETURN_CHOICE",
                currentCategoryId: null,
                currentQuestionId: null,
            })
            expect(result).toEqual({
                sessionId: "s1",
                newSession: false,
                reply: {
                    text: `Você tem atendimento marcado em ${QUANDO}.\n1. Remarcar\n2. Cancelar\n3. Tenho outra dúvida`,
                    step: "AWAITING_RETURN_CHOICE",
                    messages: [
                        {
                            type: "buttons",
                            text: `Você tem atendimento marcado em ${QUANDO}.`,
                            footer: RODAPE_RETORNO,
                            buttons: MENU_BUTTONS,
                        },
                    ],
                },
            })
        })

        test("cancela com o botão Sim, cancelar e responde com o protocolo, encerrando a conversa", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_CANCEL_CONFIRMATION", { draft: target }))
            findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment())
            cancelByCitizen.mockResolvedValueOnce({ protocol: "AB12CD34" })

            const result = await processIncomingMessage({ phone: PHONE, optionId: "cancel_yes" })

            expect(cancelByCitizen).toHaveBeenCalledWith({ sessionId: "s1", appointmentId: 7, phoneHash: `hash-${PHONE}` })
            expect(result).toEqual({
                sessionId: "s1",
                newSession: false,
                reply: {
                    text: RESPOSTA_CANCELADO("AB12CD34"),
                    step: "FINISHED",
                    messages: [{ type: "text", text: RESPOSTA_CANCELADO("AB12CD34") }],
                },
            })
            expect(updateNavigationState).not.toHaveBeenCalled()
        })

        test("cai na lista de categorias, sem cancelar de novo nem registrar consulta, quando o Sim, cancelar chega de novo depois da sessão encerrada", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_CANCEL_CONFIRMATION", { draft: target }))
            findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment())
            cancelByCitizen.mockResolvedValueOnce({ protocol: "AB12CD34" })
            await processIncomingMessage({ phone: PHONE, optionId: "cancel_yes" })
            vi.clearAllMocks()
            findOrCreateActive.mockResolvedValueOnce(buildActiveSession({ id: "s2", created: true }))
            findReturningAppointment.mockResolvedValueOnce(null)
            iniciarSessao.mockResolvedValue(categorias)

            const result = await processIncomingMessage({ phone: PHONE, optionId: "cancel_yes" })

            expect(cancelByCitizen).not.toHaveBeenCalled()
            expect(recordEvent).not.toHaveBeenCalled()
            expect(result).toEqual({
                sessionId: "s2",
                newSession: true,
                reply: {
                    text: formatarListaCategorias(categorias, 1),
                    step: "AWAITING_CATEGORY",
                    messages: criarMensagensCategorias(categorias, 1),
                },
            })
        })

        test("avisa que o agendamento não pode mais ser alterado quando o cancelamento é recusado na transação", async () => {
            findOrCreateActive.mockResolvedValueOnce(sessionAt("AWAITING_CANCEL_CONFIRMATION", { draft: target }))
            findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment())
            cancelByCitizen.mockRejectedValueOnce(new AppointmentNotChangeableError())

            const result = await processIncomingMessage({ phone: PHONE, optionId: "cancel_yes" })

            expect(result.reply).toEqual(notChangeableReply())
            expectCategoriesWithoutTarget()
        })

        test("registra a falha inesperada do cancelamento no log, avisa a instabilidade e mantém a etapa", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_CANCEL_CONFIRMATION", { id: "42", draft: target }),
            )
            findReturningAppointment.mockResolvedValueOnce(buildReturningAppointment())
            cancelByCitizen.mockRejectedValueOnce(Object.assign(new Error("db down"), { code: "ECONNRESET" }))

            const result = await processIncomingMessage({ phone: PHONE, optionId: "cancel_yes" })

            expect(logger.error).toHaveBeenCalledWith("Failed to change appointment", {
                type: "APPOINTMENT_CANCELED",
                sessionId: "42",
                code: "ECONNRESET",
            })
            expect(result.reply).toEqual({
                text: ERRO_FALHA_ALTERACAO,
                step: "AWAITING_CANCEL_CONFIRMATION",
                messages: [{ type: "text", text: ERRO_FALHA_ALTERACAO }],
            })
            expect(updateNavigationState).not.toHaveBeenCalled()
        })

        test("registra a falha da reconferência do agendamento no log, avisa a instabilidade e mantém a etapa", async () => {
            findOrCreateActive.mockResolvedValueOnce(
                sessionAt("AWAITING_CANCEL_CONFIRMATION", { id: "42", draft: target }),
            )
            findReturningAppointment.mockRejectedValueOnce(Object.assign(new Error("db down"), { code: "ECONNREFUSED" }))

            const result = await processIncomingMessage({ phone: PHONE, optionId: "cancel_yes" })

            expect(logger.error).toHaveBeenCalledWith("Failed to change appointment", {
                type: "APPOINTMENT_CANCELED",
                sessionId: "42",
                code: "ECONNREFUSED",
            })
            expect(result.reply).toEqual({
                text: ERRO_FALHA_ALTERACAO,
                step: "AWAITING_CANCEL_CONFIRMATION",
                messages: [{ type: "text", text: ERRO_FALHA_ALTERACAO }],
            })
            expect(cancelByCitizen).not.toHaveBeenCalled()
            expect(updateNavigationState).not.toHaveBeenCalled()
        })
    })
})
