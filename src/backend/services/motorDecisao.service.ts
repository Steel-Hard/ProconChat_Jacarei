import { IMotorDecisaoRepository } from "../repositories/motorDecisao.repository.interface"
import { RespostaFinalOutput, Categoria, Pergunta } from "../types/motorDecisao.types"

export class MotorDecisaoService {
    constructor(private readonly repository: IMotorDecisaoRepository) {}

    async iniciarSessao(): Promise<Categoria[]> {
        return this.repository.getCategoriasAtivas()
    }

    async escolherCategoria(categoriaId: number): Promise<Pergunta[]> {
        return this.repository.getPerguntasAtivasPorCategoria(categoriaId)
    }

    async processarPergunta(perguntaId: number): Promise<RespostaFinalOutput> {
        const pergunta = await this.repository.getPerguntaById(perguntaId)
        if (!pergunta) {
            throw new Error("Pergunta não encontrada.")
        }

        const categoria = await this.repository.getCategoriaById(pergunta.category_id)
        if (!categoria) {
            throw new Error("Categoria não encontrada.")
        }

        const documentos = await this.repository.getDocumentosPorPergunta(perguntaId)

        return {
            categoria: categoria.title,
            pergunta: pergunta.question,
            base_legal: pergunta.legal_basis || "",
            resposta: pergunta.answer,
            documentos_necessarios: documentos.map((d) => d.description),
            requer_presencial: pergunta.requires_in_person,
            fora_de_escopo: pergunta.out_of_scope,
        }
    }
}

export default MotorDecisaoService
