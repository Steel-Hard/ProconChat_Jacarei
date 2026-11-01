import { afterAll, beforeAll, describe, expect, test } from "vitest"
import getPool from "../../db/connection"
import { PgMotorDecisaoRepository } from "../../repositories/motorDecisao.repository"

const KEY = `it88_short_${process.pid}_${Date.now()}`
let categoryId = 0

describe("Repositorio do motor de decisao com Postgres: titulo curto da categoria", () => {
    beforeAll(async () => {
        const category = await getPool().query<{ id: string }>(
            `INSERT INTO Categories (title, short_title, description, position, seed_key)
             VALUES ('Cobrança/Desconto Indevido em conta', 'Cobrança indevida', 'Descricao longa', 999, $1)
             RETURNING id`,
            [`cat_${KEY}`],
        )
        categoryId = Number(category.rows[0]?.id)
        await getPool().query(
            `INSERT INTO Questions (category_id, question, short_title, answer, position, seed_key)
             VALUES ($1, 'Pergunta de teste', 'Pergunta', 'Resposta', 0, $2)`,
            [categoryId, `q_${KEY}`],
        )
    })

    afterAll(async () => {
        try {
            await getPool().query("DELETE FROM Questions WHERE category_id = $1", [categoryId])
            await getPool().query("DELETE FROM Categories WHERE id = $1", [categoryId])
        } finally {
            await getPool().end()
        }
    })

    test("getCategoriasAtivas e getCategoriaById devolvem o titulo curto sem a descricao", async () => {
        const repository = new PgMotorDecisaoRepository()

        const ativas = await repository.getCategoriasAtivas()
        const porId = await repository.getCategoriaById(categoryId)

        const expected = { id: String(categoryId), title: "Cobrança/Desconto Indevido em conta", short_title: "Cobrança indevida", active: true }
        expect(ativas.find((categoria) => String(categoria.id) === String(categoryId))).toEqual(expected)
        expect(porId).toEqual(expected)
    })
})
