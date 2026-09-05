import { IMotorDecisaoRepository } from "./motorDecisao.repository"
import { RespostaFinalOutput, Categoria, Pergunta } from "../types/motorDecisao.types"

export class MotorDecisaoService {
    constructor(private readonly repository: IMotorDecisaoRepository) {}

    /**
     * 1. Ao receber uma sessão nova, retorna a lista de categorias ativas disponíveis.
     */
    async iniciarSessao(): Promise<Categoria[]> {
        return this.repository.getCategoriasAtivas()
    }

    /**
     * 2. Ao receber a escolha de uma categoria, retorna as perguntas ativas daquela categoria.
     */
    async escolherCategoria(categoriaId: number): Promise<Pergunta[]> {
        return this.repository.getPerguntasAtivasPorCategoria(categoriaId)
    }

    /**
     * 3, 4 e 5. Ao receber a escolha de uma pergunta, monta a resposta final:
     * pergunta, base legal, resposta, documentos necessários e sinalizadores
     * de fora de escopo e atendimento presencial.
     */
    async processarPergunta(perguntaId: number): Promise<RespostaFinalOutput> {
        const pergunta = await this.repository.getPerguntaById(perguntaId)
        if (!pergunta) {
            throw new Error("Pergunta não encontrada.")
        }

        const categoria = await this.repository.getCategoriaById(pergunta.category_id)
        if (!categoria) {
            throw new Error("Categoria não encontrada.")
        }

        // Regra 4: Se marcada como fora de escopo, retorna resposta indicando claramente
        if (pergunta.out_of_scope) {
            return {
                categoria: categoria.title,
                pergunta: pergunta.question,
                base_legal: pergunta.legal_basis || "",
                resposta: "Esta dúvida está fora do escopo de atendimento do PROCON via WhatsApp.",
                documentos_necessarios: [],
                requer_presencial: pergunta.requires_in_person,
                fora_de_escopo: true,
            }
        }

        const documentos = await this.repository.getDocumentosPorPergunta(perguntaId)

        // Regras 3 e 5: Retorno final estruturado e sinalizador de presencial
        return {
            categoria: categoria.title,
            pergunta: pergunta.question,
            base_legal: pergunta.legal_basis || "",
            resposta: pergunta.answer,
            documentos_necessarios: documentos.map((d) => d.description),
            requer_presencial: pergunta.requires_in_person,
            fora_de_escopo: false,
        }
    }
}

export default MotorDecisaoService
