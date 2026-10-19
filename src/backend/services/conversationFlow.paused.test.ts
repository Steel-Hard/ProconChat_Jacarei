import { beforeEach, describe, expect, test, vi } from "vitest"
import { MENSAGEM_ATENDIMENTO_PAUSADO } from "./messageFormatter.service"
import { buildActiveSession, categorias, perguntas, respostaPadrao } from "./mock/conversationFlow.fixtures"
import { createConversationFlowHarness } from "./mock/conversationFlowHarness"

describe("conversationFlow.service com o atendimento automatico pausado (#83)", () => {
    const {
        findOrCreateActive,
        updateNavigationState,
        touch,
        finish,
        recordEvent,
        finishEvent,
        iniciarSessao,
        escolherCategoria,
        processarPergunta,
        hashPhone,
        isAutoReplyPaused,
        processIncomingMessage: flow,
    } = createConversationFlowHarness()

    const pausedReply = {
        sessionId: null,
        newSession: false,
        paused: true,
        reply: {
            text: MENSAGEM_ATENDIMENTO_PAUSADO,
            step: null,
            messages: [{ type: "text", text: MENSAGEM_ATENDIMENTO_PAUSADO }],
        },
    }

    function expectSessionUntouched() {
        expect(findOrCreateActive).not.toHaveBeenCalled()
        expect(touch).not.toHaveBeenCalled()
        expect(updateNavigationState).not.toHaveBeenCalled()
        expect(finish).not.toHaveBeenCalled()
        expect(recordEvent).not.toHaveBeenCalled()
        expect(finishEvent).not.toHaveBeenCalled()
        expect(iniciarSessao).not.toHaveBeenCalled()
        expect(escolherCategoria).not.toHaveBeenCalled()
        expect(processarPergunta).not.toHaveBeenCalled()
        expect(hashPhone).not.toHaveBeenCalled()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("responde o texto fixo da pausa sem tocar na sessao, em eventos, no motor nem no hash do telefone", async () => {
        isAutoReplyPaused.mockResolvedValue(true)

        const result = await flow({ phone: "5500000000001", text: "Olá" })

        expect(result).toEqual(pausedReply)
        expectSessionUntouched()
    })

    test("responde o mesmo texto fixo para a escolha de uma opcao durante a pausa", async () => {
        isAutoReplyPaused.mockResolvedValue(true)

        const result = await flow({ phone: "5500000000001", optionId: "cat_1" })

        expect(result).toEqual(pausedReply)
        expectSessionUntouched()
    })

    test("consulta a pausa a cada mensagem, sem guardar o estado anterior", async () => {
        isAutoReplyPaused.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
        findOrCreateActive.mockResolvedValueOnce(buildActiveSession({ created: true, draft: undefined }))
        iniciarSessao.mockResolvedValueOnce(categorias)

        const paused = await flow({ phone: "5500000000001", text: "Olá" })
        const resumed = await flow({ phone: "5500000000001", text: "Olá" })

        expect(paused).toEqual(pausedReply)
        expect(resumed).not.toHaveProperty("paused")
        expect(resumed.reply.step).toBe("AWAITING_CATEGORY")
        expect(isAutoReplyPaused).toHaveBeenCalledTimes(2)
        expect(findOrCreateActive).toHaveBeenCalledTimes(1)
    })

    test("depois de retomar, a sessao em andamento continua no passo em que estava", async () => {
        isAutoReplyPaused.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false)
        findOrCreateActive.mockResolvedValueOnce(
            buildActiveSession({ currentStep: "AWAITING_QUESTION", currentCategoryId: "1", draft: undefined }),
        )
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaPadrao)

        await flow({ phone: "5500000000001", text: "1" })
        await flow({ phone: "5500000000001", text: "1" })
        const result = await flow({ phone: "5500000000001", text: "1" })

        expect(findOrCreateActive).toHaveBeenCalledTimes(1)
        expect(touch).toHaveBeenCalledWith("s1")
        expect(escolherCategoria).toHaveBeenCalledWith(1)
        expect(processarPergunta).toHaveBeenCalledWith(10)
        expect(result.sessionId).toBe("s1")
        expect(result.reply.step).toBe("AWAITING_RESOLVED")
    })
})
