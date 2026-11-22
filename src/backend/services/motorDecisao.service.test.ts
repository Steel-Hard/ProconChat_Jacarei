import { describe, it, expect, beforeEach, vi } from "vitest"
import { MotorDecisaoService } from "./motorDecisao.service"
import { MockMotorDecisaoRepository } from "../repositories/mock/motorDecisaoMock.repository"

describe("MotorDecisaoService", () => {
    let service: MotorDecisaoService
    let repository: MockMotorDecisaoRepository

    beforeEach(() => {
        repository = new MockMotorDecisaoRepository()
        service = new MotorDecisaoService(repository)
    })

    it("deve retornar apenas as categorias ativas ao iniciar uma nova sessão", async () => {
        const categorias = await service.iniciarSessao()

        expect(categorias.length).toBe(2)
        expect(categorias.map((c) => c.title)).toEqual([
            "Direito de Arrependimento",
            "Garantia e Defeitos",
        ])
        expect(categorias.some((c) => c.title === "Categoria Inativa")).toBe(false)
    })

    it("deve retornar as perguntas ativas de uma categoria selecionada", async () => {
        const perguntas = await service.escolherCategoria(1)

        expect(perguntas.length).toBe(2)
        expect(perguntas.map((p) => p.question)).toContain(
            "Posso desistir de uma compra feita pela internet?"
        )
        expect(perguntas.some((p) => p.question === "Pergunta inativa?")).toBe(false)
    })

    it("deve montar resposta final estruturada para uma pergunta padrão", async () => {
        const resposta = await service.processarPergunta(1)

        expect(resposta).toEqual({
            categoria: "Direito de Arrependimento",
            pergunta: "Posso desistir de uma compra feita pela internet?",
            base_legal: "Art. 49 do CDC",
            resposta: "Sim, em compras online você tem até 7 dias corridos após o recebimento para desistir.",
            documentos_necessarios: ["Nota fiscal", "Comprovante de pagamento"],
            requer_presencial: false,
            fora_de_escopo: false,
        })
    })

    it("deve devolver a resposta escrita pela equipe e os documentos nos casos fora de escopo", async () => {
        const resposta = await service.processarPergunta(2)

        expect(resposta.fora_de_escopo).toBe(true)
        expect(resposta.resposta).toBe("Procure a delegacia de polícia mais próxima.")
        expect(resposta.documentos_necessarios).toEqual(["Documento de identificação"])
        expect(resposta.requer_presencial).toBe(false)
    })

    describe("observação do atendimento presencial", () => {
        async function respostaComNota(overrides: { requires_in_person: boolean; in_person_note: string | null | undefined }) {
            const original = await repository.getPerguntaById(3)
            vi.spyOn(repository, "getPerguntaById").mockResolvedValue({ ...original!, ...overrides })
            return service.processarPergunta(3)
        }

        it("preenche a observação em pergunta presencial com texto, sem espaços nas pontas", async () => {
            const resposta = await respostaComNota({ requires_in_person: true, in_person_note: "  Traga o contrato impresso.  " })

            expect(resposta.observacao_presencial).toBe("Traga o contrato impresso.")
        })

        it("deixa o campo ausente quando a observação está vazia, em branco ou ausente", async () => {
            for (const in_person_note of ["", "   ", null, undefined]) {
                const resposta = await respostaComNota({ requires_in_person: true, in_person_note })
                expect(resposta).not.toHaveProperty("observacao_presencial")
            }
        })

        it("deixa o campo ausente quando a pergunta não exige atendimento presencial", async () => {
            const resposta = await respostaComNota({ requires_in_person: false, in_person_note: "Traga o contrato." })

            expect(resposta).not.toHaveProperty("observacao_presencial")
        })
    })

    it("deve identificar casos que exigem atendimento presencial", async () => {
        const resposta = await service.processarPergunta(3)

        expect(resposta.requer_presencial).toBe(true)
        expect(resposta.fora_de_escopo).toBe(false)
        expect(resposta.categoria).toBe("Garantia e Defeitos")
        expect(resposta.documentos_necessarios).toContain("Nota fiscal")
        expect(resposta.documentos_necessarios).toContain(
            "Ordem de serviço da assistência"
        )
    })

    it("deve lançar erro se a pergunta não for encontrada", async () => {
        await expect(service.processarPergunta(999)).rejects.toThrow(
            "Pergunta não encontrada."
        )
    })

    it("deve lançar erro se a categoria da pergunta não for encontrada", async () => {
        await expect(service.processarPergunta(5)).rejects.toThrow(
            "Categoria não encontrada."
        )
    })

    it("deve substituir {endereco} e {horarios} na resposta quando presentes e não consultar a agenda quando ausentes", async () => {
        const getScheduleConfig = vi.fn().mockResolvedValue({
            unitAddress: "Av. Nove de Julho, 215 - Centro, Jacareí - SP",
            unitAddressComplement: "Sala 2",
            ranges: [1, 2, 3, 4, 5].flatMap((weekday) => [
                { weekday, slotIndex: 1, startTime: "08:30", endTime: "11:30" },
                { weekday, slotIndex: 2, startTime: "13:30", endTime: "16:30" },
            ]),
        })
        const serviceWithSchedule = new MotorDecisaoService(repository, getScheduleConfig)

        await serviceWithSchedule.processarPergunta(1)
        expect(getScheduleConfig).not.toHaveBeenCalled()

        const original = await repository.getPerguntaById(1)
        vi.spyOn(repository, "getPerguntaById").mockResolvedValue({
            ...original!,
            question: "Qual é o horário e o endereço do PROCON?",
            answer: "O atendimento funciona de {horarios}, em {endereco}.",
        })

        const resposta = await serviceWithSchedule.processarPergunta(1)
        expect(getScheduleConfig).toHaveBeenCalledTimes(1)
        expect(resposta.resposta).toBe(
            "O atendimento funciona de segunda a sexta, das 08:30 às 11:30 e das 13:30 às 16:30, em Av. Nove de Julho, 215 - Centro, Jacareí - SP (Sala 2).",
        )
    })
    it("deve trocar os marcadores pelos textos de agenda não configurada quando não há configuração de Horários", async () => {
        const getScheduleConfig = vi.fn().mockResolvedValue(null)
        const serviceWithoutSchedule = new MotorDecisaoService(repository, getScheduleConfig)

        const original = await repository.getPerguntaById(1)
        vi.spyOn(repository, "getPerguntaById").mockResolvedValue({
            ...original!,
            answer: "Atendemos de {horarios}, em {endereco}.",
        })

        const resposta = await serviceWithoutSchedule.processarPergunta(1)
        expect(resposta.resposta).toBe(
            "Atendemos de sem horários de atendimento configurados, em endereço não configurado.",
        )
    })
})
