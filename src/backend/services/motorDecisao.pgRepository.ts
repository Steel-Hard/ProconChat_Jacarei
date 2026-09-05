import getPool from "../db/connection"
import { Categoria, Pergunta, DocumentoNecessario } from "../types/motorDecisao.types"
import { IMotorDecisaoRepository } from "./motorDecisao.repository"

export class PgMotorDecisaoRepository implements IMotorDecisaoRepository {
    private pool = getPool()

    async getCategoriasAtivas(): Promise<Categoria[]> {
        const result = await this.pool.query<Categoria>(
            "SELECT id, title, active FROM Categories WHERE active = true ORDER BY id ASC"
        )
        return result.rows
    }

    async getPerguntasAtivasPorCategoria(categoriaId: number): Promise<Pergunta[]> {
        const result = await this.pool.query<Pergunta>(
            "SELECT * FROM Questions WHERE category_id = $1 AND active = true ORDER BY id ASC",
            [categoriaId]
        )
        return result.rows
    }

    async getPerguntaById(perguntaId: number): Promise<Pergunta | null> {
        const result = await this.pool.query<Pergunta>(
            "SELECT * FROM Questions WHERE id = $1",
            [perguntaId]
        )
        return result.rows[0] || null
    }

    async getCategoriaById(categoriaId: number): Promise<Categoria | null> {
        const result = await this.pool.query<Categoria>(
            "SELECT id, title, active FROM Categories WHERE id = $1",
            [categoriaId]
        )
        return result.rows[0] || null
    }

    async getDocumentosPorPergunta(perguntaId: number): Promise<DocumentoNecessario[]> {
        const result = await this.pool.query<DocumentoNecessario>(
            "SELECT id, question_id, description FROM RequiredDocuments WHERE question_id = $1",
            [perguntaId]
        )
        return result.rows
    }
}
