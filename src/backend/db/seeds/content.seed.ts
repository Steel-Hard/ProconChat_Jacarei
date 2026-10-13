import { PoolClient } from "pg"
import proconFaqSeed from "./data/procon-faq.data"
import { FaqCategorySeed, FaqQuestionSeed } from "./data/types"

export interface SeedRowCounts {
    inserted: number
    updated: number
    kept: number
}

export interface ContentSeedResult {
    categories: SeedRowCounts
    questions: SeedRowCounts
}

type RowOutcome = "inserted" | "updated" | "kept"

interface SeedRow {
    id: string
    edited: boolean
}

const emptyCounts = (): SeedRowCounts => ({ inserted: 0, updated: 0, kept: 0 })

async function findBySeedKey(client: PoolClient, table: "Categories" | "Questions", seedKey: string): Promise<SeedRow | undefined> {
    const result = await client.query<SeedRow>(
        `SELECT id, updated_by IS NOT NULL AS edited FROM ${table} WHERE seed_key = $1`,
        [seedKey]
    )
    return result.rows[0]
}

async function backfillSeedKey(
    client: PoolClient,
    table: "Categories" | "Questions",
    seedKey: string,
    candidates: SeedRow[]
): Promise<SeedRow | undefined> {
    const [row] = candidates
    if (!row) {
        return undefined
    }
    if (candidates.length > 1) {
        console.warn(
            `Seed: ${candidates.length} linhas de ${table} sem seed_key casam com "${seedKey}"; usando o menor id (${row.id}).`
        )
    }
    await client.query(`UPDATE ${table} SET seed_key = $1 WHERE id = $2`, [seedKey, row.id])
    return row
}

async function upsertCategory(client: PoolClient, category: FaqCategorySeed, position: number): Promise<{ id: string; outcome: RowOutcome }> {
    let row = await findBySeedKey(client, "Categories", category.seedKey)
    let backfilled = false

    if (!row) {
        const candidates = await client.query<SeedRow>(
            "SELECT id, updated_by IS NOT NULL AS edited FROM Categories WHERE seed_key IS NULL AND title = $1 ORDER BY id",
            [category.title]
        )
        row = await backfillSeedKey(client, "Categories", category.seedKey, candidates.rows)
        backfilled = row !== undefined
    }

    if (!row) {
        const inserted = await client.query<{ id: string }>(
            `INSERT INTO Categories (seed_key, title, short_title, description, position, active)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING id`,
            [category.seedKey, category.title, category.shortTitle, category.description, position]
        )
        const id = inserted.rows[0]?.id
        if (!id) {
            throw new Error(`Falha ao inserir a categoria "${category.seedKey}"`)
        }
        return { id, outcome: "inserted" }
    }

    if (row.edited) {
        return { id: row.id, outcome: backfilled ? "updated" : "kept" }
    }

    const updated = await client.query(
        `UPDATE Categories
         SET title = $2, short_title = $3, description = $4, position = $5, updated_at = now()
         WHERE id = $1
           AND updated_by IS NULL
           AND (title IS DISTINCT FROM $2
                OR short_title IS DISTINCT FROM $3
                OR description IS DISTINCT FROM $4
                OR position IS DISTINCT FROM $5)`,
        [row.id, category.title, category.shortTitle, category.description, position]
    )
    return { id: row.id, outcome: backfilled || (updated.rowCount ?? 0) > 0 ? "updated" : "kept" }
}

async function syncRequiredDocuments(client: PoolClient, questionId: string, documents: string[]): Promise<boolean> {
    const current = await client.query<{ description: string; position: number }>(
        "SELECT description, position FROM RequiredDocuments WHERE question_id = $1 ORDER BY position, id",
        [questionId]
    )
    const unchanged =
        current.rows.length === documents.length &&
        current.rows.every((row, index) => row.description === documents[index] && row.position === index)
    if (unchanged) {
        return false
    }

    await client.query("DELETE FROM RequiredDocuments WHERE question_id = $1", [questionId])
    for (const [index, description] of documents.entries()) {
        await client.query(
            "INSERT INTO RequiredDocuments (question_id, description, position) VALUES ($1, $2, $3)",
            [questionId, description, index]
        )
    }
    return true
}

async function upsertQuestion(
    client: PoolClient,
    categoryId: string,
    question: FaqQuestionSeed,
    position: number
): Promise<RowOutcome> {
    const outOfScope = question.outOfScope ?? false
    const values = [
        question.question,
        question.shortTitle,
        question.shortDescription ?? null,
        question.legalBasis,
        question.answer,
        question.requiresInPerson,
        outOfScope,
        question.llmAllowed ?? !outOfScope,
        position,
    ]

    let row = await findBySeedKey(client, "Questions", question.seedKey)
    let backfilled = false

    if (!row) {
        const candidates = await client.query<SeedRow>(
            `SELECT id, updated_by IS NOT NULL AS edited FROM Questions
             WHERE seed_key IS NULL AND category_id = $1 AND question = $2
             ORDER BY id`,
            [categoryId, question.question]
        )
        row = await backfillSeedKey(client, "Questions", question.seedKey, candidates.rows)
        backfilled = row !== undefined
    }

    if (!row) {
        const inserted = await client.query<{ id: string }>(
            `INSERT INTO Questions
                (question, short_title, short_description, legal_basis, answer, requires_in_person, out_of_scope, llm_allowed, position, seed_key, category_id, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
             RETURNING id`,
            [...values, question.seedKey, categoryId]
        )
        const id = inserted.rows[0]?.id
        if (!id) {
            throw new Error(`Falha ao inserir a pergunta "${question.seedKey}"`)
        }
        await syncRequiredDocuments(client, id, question.requiredDocuments)
        return "inserted"
    }

    if (row.edited) {
        return backfilled ? "updated" : "kept"
    }

    const updated = await client.query(
        `UPDATE Questions
         SET question = $2, short_title = $3, short_description = $4, legal_basis = $5, answer = $6,
             requires_in_person = $7, out_of_scope = $8, llm_allowed = $9, position = $10, updated_at = now()
         WHERE id = $1
           AND updated_by IS NULL
           AND (question IS DISTINCT FROM $2
                OR short_title IS DISTINCT FROM $3
                OR short_description IS DISTINCT FROM $4
                OR legal_basis IS DISTINCT FROM $5
                OR answer IS DISTINCT FROM $6
                OR requires_in_person IS DISTINCT FROM $7
                OR out_of_scope IS DISTINCT FROM $8
                OR llm_allowed IS DISTINCT FROM $9
                OR position IS DISTINCT FROM $10)`,
        [row.id, ...values]
    )
    const documentsChanged = await syncRequiredDocuments(client, row.id, question.requiredDocuments)
    return backfilled || (updated.rowCount ?? 0) > 0 || documentsChanged ? "updated" : "kept"
}

export async function seedContent(client: PoolClient): Promise<ContentSeedResult> {
    const result: ContentSeedResult = { categories: emptyCounts(), questions: emptyCounts() }

    for (const [categoryPosition, category] of proconFaqSeed.entries()) {
        const { id: categoryId, outcome } = await upsertCategory(client, category, categoryPosition)
        result.categories[outcome] += 1

        for (const [questionPosition, question] of category.questions.entries()) {
            const questionOutcome = await upsertQuestion(client, categoryId, question, questionPosition)
            result.questions[questionOutcome] += 1
        }
    }

    return result
}
