import { beforeEach, describe, expect, test, vi } from "vitest"
import { SessionRepository } from "../repositories/session.repository"
import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import {
    createConversationFlowService,
    MotorDecisao,
    ScheduleProvider,
} from "./conversationFlow.service"
import {
    ERRO_ATTENDEE,
    ERRO_CPF,
    ERRO_NOME,
    ERRO_OFERTA_AGENDAMENTO,
    ERRO_RESOLVIDA,
    ERRO_SLOT_OCUPADO,
    formatarListaPerguntas,
    formatarListaSlots,
    MENSAGEM_SEM_HORARIOS,
    OFERTA_AGENDAMENTO,
    PERGUNTA_RESOLVIDA,
    PROMPT_CPF,
    PROMPT_NOME,
    RESPOSTA_INICIO_AGENDAMENTO,
    RESPOSTA_RECUSA_AGENDAMENTO,
    RESPOSTA_RESOLVIDA_SIM,
} from "./messageFormatter.service"
import { AvailableSlot, BookAppointmentResult } from "../types/schedule.types"

const categorias: Categoria[] = [
    { id: 1, title: "Contrato", active: true },
    { id: 2, title: "Garantias", active: true },
]

const perguntas: Pergunta[] = [
    {
        id: 10,
        category_id: 1,
        question: "Posso cancelar o contrato?",
        legal_basis: "Art. 49 do CDC",
        answer: "Sim.",
        requires_in_person: false,
        out_of_scope: false,
        active: true,
    },
    {
        id: 11,
        category_id: 1,
        question: "Como denunciar crime cibernético?",
        legal_basis: null,
        answer: "Procure a delegacia.",
        requires_in_person: false,
        out_of_scope: true,
        active: true,
    },
    {
        id: 12,
        category_id: 1,
        question: "Quero abrir processo formal?",
        legal_basis: null,
        answer: "Compareça ao PROCON.",
        requires_in_person: true,
        out_of_scope: false,
        active: true,
    },
]

const respostaPadrao: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Posso cancelar o contrato?",
    base_legal: "Art. 49 do CDC",
    resposta: "Sim, você pode cancelar em até 7 dias.",
    documentos_necessarios: ["Nota fiscal"],
    requer_presencial: false,
    fora_de_escopo: false,
}

const respostaForaEscopo: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Como denunciar crime cibernético?",
    base_legal: "",
    resposta: "Esta dúvida está fora do escopo.",
    documentos_necessarios: [],
    requer_presencial: false,
    fora_de_escopo: true,
}

const respostaPresencial: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Quero abrir processo formal?",
    base_legal: "",
    resposta: "Esta situação exige atendimento presencial.",
    documentos_necessarios: ["RG", "CPF"],
    requer_presencial: true,
    fora_de_escopo: false,
}

const mockSlots: AvailableSlot[] = [
    {
        datetime: new Date("2026-10-06T08:00:00-03:00"),
        dateStr: "2026-10-06",
        timeStr: "08:00",
        formatted: "Terça-feira, 06/10 às 08:00",
        remainingSeats: 2,
    },
    {
        datetime: new Date("2026-10-06T08:30:00-03:00"),
        dateStr: "2026-10-06",
        timeStr: "08:30",
        formatted: "Terça-feira, 06/10 às 08:30",
        remainingSeats: 1,
    },
]

const mockBookResult: BookAppointmentResult = {
    id: "1",
    appointmentCode: "a3f9c21b-0000-0000-0000-000000000000",
    protocol: "A3F9C21B",
    appointmentDatetime: new Date("2026-10-06T08:00:00-03:00"),
    unitAddress: "Rua do Procon, 100",
    unitAddressComplement: "Centro",
    documentsSent: {
        group: ["RG", "CPF"],
        question: ["Contrato"],
    },
    reminderEnabled: true,
    reminderHours: 24,
}

describe("conversationFlow.service", () => {
    const findOrCreateActive = vi.fn()
    const updateNavigationState = vi.fn()
    const finish = vi.fn()
    const sessions: SessionRepository = { findOrCreateActive, updateNavigationState, finish }

    const iniciarSessao = vi.fn()
    const escolherCategoria = vi.fn()
    const processarPergunta = vi.fn()
    const motor: MotorDecisao = { iniciarSessao, escolherCategoria, processarPergunta }

    const getAvailableSlots = vi.fn()
    const bookSlot = vi.fn()
    const schedule: ScheduleProvider = { getAvailableSlots, bookSlot }

    const hashPhone = (phone: string) => `hash-${phone}`

    const processIncomingMessage = createConversationFlowService({
        sessions,
        motor,
        schedule,
        hashPhone,
    })

    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("sessão nova inicia com saudação, aviso LGPD e lista de categorias", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: true,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            listPage: 1,
            draft: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "Olá" })

        expect(findOrCreateActive).toHaveBeenCalledWith("hash-5511999999999")
        expect(iniciarSessao).toHaveBeenCalledOnce()
        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            currentQuestionId: null,
            listPage: 1,
            draft: null,
        })
        expect(result.reply.text).toContain("LGPD")
        expect(result.reply.text).toContain("caráter informativo")
        expect(result.reply.step).toBe("AWAITING_CATEGORY")
    })

    test("AWAITING_CATEGORY avança para AWAITING_QUESTION ao selecionar categoria válida", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            listPage: 1,
            draft: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)
        escolherCategoria.mockResolvedValueOnce(perguntas)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(escolherCategoria).toHaveBeenCalledWith(categorias[0]?.id)
        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: String(categorias[0]?.id),
            listPage: 1,
        })
        expect(result.reply.step).toBe("AWAITING_QUESTION")
        expect(result.reply.text).toEqual(formatarListaPerguntas(perguntas, 1))
    })

    test("AWAITING_CATEGORY com paginação: 'Ver mais opções' avança página", async () => {
        const muitasCategorias: Categoria[] = Array.from({ length: 15 }, (_, i) => ({
            id: i + 1,
            title: `Categoria ${i + 1}`,
            active: true,
        }))

        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            listPage: 1,
            draft: null,
        })
        iniciarSessao.mockResolvedValueOnce(muitasCategorias)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "10" })

        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_CATEGORY",
            listPage: 2,
        })
        expect(result.reply.step).toBe("AWAITING_CATEGORY")
        expect(result.reply.text).toContain("Categoria 10")
    })

    test("AWAITING_QUESTION: pergunta padrão avança para AWAITING_RESOLVED ('A dúvida foi resolvida?')", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaPadrao)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(processarPergunta).toHaveBeenCalledWith(perguntas[0]?.id)
        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_RESOLVED",
            currentQuestionId: String(perguntas[0]?.id),
        })
        expect(result.reply.step).toBe("AWAITING_RESOLVED")
        expect(result.reply.text).toContain(PERGUNTA_RESOLVIDA)
        expect(result.reply.text).toContain("O que fazer agora")
        expect(finish).not.toHaveBeenCalled()
    })

    test("AWAITING_QUESTION: pergunta fora do escopo encerra com OUT_OF_SCOPE imediatamente", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaForaEscopo)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "2" })

        expect(finish).toHaveBeenCalledWith("s1", "OUT_OF_SCOPE")
        expect(result.reply.step).toBe("FINISHED")
        expect(result.reply.text).not.toContain(PERGUNTA_RESOLVIDA)
        expect(result.reply.text).not.toContain(OFERTA_AGENDAMENTO)
    })

    test("AWAITING_QUESTION: pergunta presencial pula 'resolveu?' e oferece agendamento direto", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaPresencial)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "3" })

        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentQuestionId: String(perguntas[2]?.id),
        })
        expect(result.reply.step).toBe("AWAITING_SCHEDULE_OFFER")
        expect(result.reply.text).toContain(OFERTA_AGENDAMENTO)
        expect(result.reply.text).not.toContain(PERGUNTA_RESOLVIDA)
    })

    test("AWAITING_RESOLVED: Sim (1) finaliza a sessão com RESOLVED", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(finish).toHaveBeenCalledWith("s1", "RESOLVED")
        expect(result.reply.step).toBe("FINISHED")
        expect(result.reply.text).toBe(RESPOSTA_RESOLVIDA_SIM)
    })

    test("AWAITING_RESOLVED: Não (2) avança para AWAITING_SCHEDULE_OFFER", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "2" })

        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_SCHEDULE_OFFER",
        })
        expect(result.reply.step).toBe("AWAITING_SCHEDULE_OFFER")
        expect(result.reply.text).toBe(OFERTA_AGENDAMENTO)
        expect(finish).not.toHaveBeenCalled()
    })

    test("AWAITING_RESOLVED: entrada inválida re-pergunta se foi resolvida", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "invalido" })

        expect(result.reply.step).toBe("AWAITING_RESOLVED")
        expect(result.reply.text).toBe(ERRO_RESOLVIDA)
    })

    test("AWAITING_SCHEDULE_OFFER: Agora não (2) finaliza com DECLINED", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "2" })

        expect(finish).toHaveBeenCalledWith("s1", "DECLINED")
        expect(result.reply.step).toBe("FINISHED")
        expect(result.reply.text).toBe(RESPOSTA_RECUSA_AGENDAMENTO)
    })

    test("AWAITING_SCHEDULE_OFFER: Agendar (1) avança para AWAITING_ATTENDEE", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_ATTENDEE",
        })
        expect(result.reply.step).toBe("AWAITING_ATTENDEE")
        expect(result.reply.text).toBe(RESPOSTA_INICIO_AGENDAMENTO)
    })

    test("AWAITING_SCHEDULE_OFFER: entrada inválida re-pergunta opção de agendamento", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "99" })

        expect(result.reply.step).toBe("AWAITING_SCHEDULE_OFFER")
        expect(result.reply.text).toBe(ERRO_OFERTA_AGENDAMENTO)
    })

    describe("Fluxo de Agendamento Presencial (#56)", () => {
        test("AWAITING_ATTENDEE: opção 1 (titular) salva draft e avança para AWAITING_HOLDER_NAME", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_ATTENDEE",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: null,
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_HOLDER_NAME",
                draft: { by_representative: false },
            })
            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(PROMPT_NOME)
        })

        test("AWAITING_ATTENDEE: opção 2 (representante) salva draft e avança para AWAITING_HOLDER_NAME", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_ATTENDEE",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: null,
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "2" })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_HOLDER_NAME",
                draft: { by_representative: true },
            })
            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(PROMPT_NOME)
        })

        test("AWAITING_ATTENDEE: opção inválida re-solicita escolha de quem comparecerá", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_ATTENDEE",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: null,
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "invalido" })

            expect(result.reply.step).toBe("AWAITING_ATTENDEE")
            expect(result.reply.text).toBe(ERRO_ATTENDEE)
        })

        test("AWAITING_HOLDER_NAME: nome válido salva draft e avança para AWAITING_HOLDER_CPF", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_NAME",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false },
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "Maria da Silva" })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_HOLDER_CPF",
                draft: {
                    by_representative: false,
                    holder_name: "Maria da Silva",
                },
            })
            expect(result.reply.step).toBe("AWAITING_HOLDER_CPF")
            expect(result.reply.text).toBe(PROMPT_CPF)
        })

        test("AWAITING_HOLDER_NAME: nome inválido (vazio ou 1 caractere) re-solicita nome", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_NAME",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false },
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "A" })

            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(ERRO_NOME)
        })

        test("AWAITING_HOLDER_CPF: CPF inválido re-solicita CPF", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_CPF",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false, holder_name: "Maria da Silva" },
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "123.456.789-00" })

            expect(result.reply.step).toBe("AWAITING_HOLDER_CPF")
            expect(result.reply.text).toBe(ERRO_CPF)
        })

        test("AWAITING_HOLDER_CPF: CPF válido com horários disponíveis avança para AWAITING_SLOT", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_CPF",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false, holder_name: "Maria da Silva" },
            })
            getAvailableSlots.mockResolvedValueOnce(mockSlots)

            // CPF válido: 529.982.247-25
            const result = await processIncomingMessage({ phone: "5511999999999", text: "529.982.247-25" })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", expect.objectContaining({
                currentStep: "AWAITING_SLOT",
                listPage: 1,
                draft: expect.objectContaining({
                    holder_name: "Maria da Silva",
                    cpf_masked: "***.982.247-**",
                }),
            }))
            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toEqual(formatarListaSlots(mockSlots, 1))
        })

        test("AWAITING_HOLDER_CPF: CPF válido mas sem horários disponíveis encerra com NO_SLOT", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_CPF",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false, holder_name: "Maria da Silva" },
            })
            getAvailableSlots.mockResolvedValueOnce([])

            const result = await processIncomingMessage({ phone: "5511999999999", text: "52998224725" })

            expect(finish).toHaveBeenCalledWith("s1", "NO_SLOT")
            expect(result.reply.step).toBe("FINISHED")
            expect(result.reply.text).toBe(MENSAGEM_SEM_HORARIOS)
        })

        test("AWAITING_SLOT: escolhe slot válido realiza agendamento e retorna confirmação", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_SLOT",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: {
                    by_representative: false,
                    holder_name: "Maria da Silva",
                    cpf_hash: "a".repeat(64),
                    cpf_masked: "***.982.247-**",
                },
            })
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockResolvedValueOnce(mockBookResult)

            const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

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

        test("AWAITING_SLOT: conflito de concorrência (SLOT_FULL) avisa e recarrega horários", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_SLOT",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: {
                    by_representative: false,
                    holder_name: "Maria da Silva",
                    cpf_hash: "a".repeat(64),
                    cpf_masked: "***.982.247-**",
                },
            })
            // Primeira chamada traz slots originais
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockRejectedValueOnce(new Error("SLOT_FULL"))
            // Segunda chamada traz apenas o slot restante
            const remainingSlot = [mockSlots[1]!]
            getAvailableSlots.mockResolvedValueOnce(remainingSlot)

            const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toContain(ERRO_SLOT_OCUPADO)
            expect(result.reply.text).toContain("1. Terça-feira, 06/10 às 08:30")
        })
    })
})
