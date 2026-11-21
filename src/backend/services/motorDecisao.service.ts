import { IMotorDecisaoRepository } from "../repositories/motorDecisao.repository.interface"
import { scheduleRepository } from "../repositories/schedule.repository"
import { RespostaFinalOutput, Categoria, Pergunta } from "../types/motorDecisao.types"
import {
    hasAnswerPlaceholders,
    resolveAnswerPlaceholders,
    SchedulePlaceholdersSource,
} from "./contentRules"

export class MotorDecisaoService {
    constructor(
        private readonly repository: IMotorDecisaoRepository,
        private readonly getScheduleConfig: () => Promise<SchedulePlaceholdersSource | null> = () =>
            scheduleRepository.getConfig(),
    ) {}

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

        const [documentos, schedule] = await Promise.all([
            this.repository.getDocumentosPorPergunta(perguntaId),
            hasAnswerPlaceholders(pergunta.answer)
                ? this.getScheduleConfig()
                : Promise.resolve(null),
        ])

        const observacaoPresencial = pergunta.requires_in_person ? pergunta.in_person_note?.trim() : undefined

        return {
            categoria: categoria.title,
            pergunta: pergunta.question,
            base_legal: pergunta.legal_basis || "",
            resposta: resolveAnswerPlaceholders(pergunta.answer, schedule),
            documentos_necessarios: documentos.map((d) => d.description),
            requer_presencial: pergunta.requires_in_person,
            fora_de_escopo: pergunta.out_of_scope,
            ...(observacaoPresencial ? { observacao_presencial: observacaoPresencial } : {}),
        }
    }
}

export default MotorDecisaoService
