import getPool from "../connection"
import proconFaqSeed from "./data/procon-faq.data"

async function run(): Promise<void> {
    const pool = getPool()
    const client = await pool.connect()

    try {
        await client.query("BEGIN")

        const titles = proconFaqSeed.map((category) => category.title)

        await client.query(
            `DELETE FROM RequiredDocuments
             WHERE question_id IN (
                 SELECT id FROM Questions
                 WHERE category_id IN (SELECT id FROM Categories WHERE title = ANY($1::text[]))
             )`,
            [titles]
        )
        await client.query(
            `DELETE FROM Questions
             WHERE category_id IN (SELECT id FROM Categories WHERE title = ANY($1::text[]))`,
            [titles]
        )
        await client.query("DELETE FROM Categories WHERE title = ANY($1::text[])", [titles])

        for (const category of proconFaqSeed) {
            const categoryResult = await client.query<{ id: number }>(
                "INSERT INTO Categories (title, description, active) VALUES ($1, $2, true) RETURNING id",
                [category.title, category.description]
            )
            const categoryId = categoryResult.rows[0]?.id
            if (!categoryId) {
                throw new Error(`Falha ao inserir a categoria "${category.title}"`)
            }

            for (const question of category.questions) {
                const questionResult = await client.query<{ id: number }>(
                    `INSERT INTO Questions
                        (category_id, question, legal_basis, answer, requires_in_person, out_of_scope, active)
                     VALUES ($1, $2, $3, $4, $5, $6, true)
                     RETURNING id`,
                    [
                        categoryId,
                        question.question,
                        question.legalBasis,
                        question.answer,
                        question.requiresInPerson,
                        question.outOfScope ?? false,
                    ]
                )
                const questionId = questionResult.rows[0]?.id
                if (!questionId) {
                    throw new Error(`Falha ao inserir a pergunta "${question.question}"`)
                }

                for (const document of question.requiredDocuments) {
                    await client.query(
                        "INSERT INTO RequiredDocuments (question_id, description) VALUES ($1, $2)",
                        [questionId, document]
                    )
                }
            }
        }

        await client.query("COMMIT")
        console.log("Seed concluído: 7 categorias / 47 perguntas do FAQ do PROCON carregadas.")
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((error) => {
    console.error("Falha ao rodar o seed:", error)
    process.exit(1)
})
