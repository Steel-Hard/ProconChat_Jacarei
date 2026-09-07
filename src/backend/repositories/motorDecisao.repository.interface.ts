import { Categoria, Pergunta, DocumentoNecessario } from "../types/motorDecisao.types"

export interface IMotorDecisaoRepository {
    getCategoriasAtivas(): Promise<Categoria[]>
    getPerguntasAtivasPorCategoria(categoriaId: number): Promise<Pergunta[]>
    getPerguntaById(perguntaId: number): Promise<Pergunta | null>
    getCategoriaById(categoriaId: number): Promise<Categoria | null>
    getDocumentosPorPergunta(perguntaId: number): Promise<DocumentoNecessario[]>
}
