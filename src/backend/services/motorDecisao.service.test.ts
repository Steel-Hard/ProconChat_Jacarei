import { describe, it, expect, beforeEach } from "vitest"
import { MotorDecisaoService } from "./motorDecisao.service"
import { MockMotorDecisaoRepository } from "./motorDecisao.repository"

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

    it("deve identificar casos fora de escopo e retornar mensagem apropriada", async () => {
        const resposta = await service.processarPergunta(2)

        expect(resposta.fora_de_escopo).toBe(true)
        expect(resposta.resposta).toBe(
            "Esta dúvida está fora do escopo de atendimento do PROCON via WhatsApp."
        )
        expect(resposta.documentos_necessarios).toEqual([])
        expect(resposta.requer_presencial).toBe(false)
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
})
