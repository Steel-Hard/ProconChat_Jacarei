import { PoolClient } from "pg"
import getPool from "../db/connection"
import { IContentRepository } from "./content.repository.interface"
import {
    CategoryCreateInput,
    CategoryRecord,
    CategoryUpdateInput,
    QuestionRecord,
    QuestionWriteInput,
} from "../types/content.types"

const ACCENT_FROM = "áàâãäéèêëíìîïóòôõöúùûüçñýÿÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝŸ"
const ACCENT_TO = "aaaaaeeeeiiiiooooouuuucnyyaaaaaeeeeiiiiooooouuuucnyy"

export function normalizeComparisonText(value: string): string {
    return value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
}

function escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, "\\$&")
}

function sqlAccentInsensitive(columnExpr: string): string {
    return `translate(LOWER(btrim(${columnExpr})), '${ACCENT_FROM}', '${ACCENT_TO}')`
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect()
    try {
        await client.query("BEGIN")
        const result = await fn(client)
        await client.query("COMMIT")
        return result
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
    }
}

interface CategoryRow {
    id: number
    title: string
    short_title: string
    description: string | null
    active: boolean
    position: number
    questions_count: number
    active_questions_count: number
    updated_by_id: number | null
    updated_by_name: string | null
    updated_at: Date | string
}

interface QuestionRow {
    id: number
    category_id: number
    category_title: string
    short_title: string
    short_description: string | null
    question: string
    answer: string
    legal_basis: string | null
    required_documents: string[] | null
    requires_in_person: boolean
    in_person_note: string | null
    out_of_scope: boolean
    llm_allowed: boolean
    active: boolean
    position: number
    updated_by_id: number | null
    updated_by_name: string | null
    updated_at: Date | string
}

function toIsoString(val: Date | string): string {
    return val instanceof Date ? val.toISOString() : new Date(val).toISOString()
}

function mapCategoryRow(row: CategoryRow): CategoryRecord {
    return {
        id: Number(row.id),
        title: row.title,
        shortTitle: row.short_title,
        description: row.description,
        active: Boolean(row.active),
        position: Number(row.position),
        questionsCount: Number(row.questions_count),
        activeQuestionsCount: Number(row.active_questions_count),
        updatedBy:
            row.updated_by_id !== null && row.updated_by_name !== null
                ? { id: Number(row.updated_by_id), name: row.updated_by_name }
                : null,
        updatedAt: toIsoString(row.updated_at),
    }
}

function mapQuestionRow(row: QuestionRow): QuestionRecord {
    return {
        id: Number(row.id),
        categoryId: Number(row.category_id),
        categoryTitle: row.category_title,
        shortTitle: row.short_title,
        shortDescription: row.short_description,
        question: row.question,
        answer: row.answer,
        legalBasis: row.legal_basis,
        requiredDocuments: Array.isArray(row.required_documents) ? row.required_documents : [],
        requiresInPerson: Boolean(row.requires_in_person),
        inPersonNote: row.in_person_note,
        outOfScope: Boolean(row.out_of_scope),
        llmAllowed: Boolean(row.llm_allowed),
        active: Boolean(row.active),
        position: Number(row.position),
        updatedBy:
            row.updated_by_id !== null && row.updated_by_name !== null
                ? { id: Number(row.updated_by_id), name: row.updated_by_name }
                : null,
        updatedAt: toIsoString(row.updated_at),
    }
}

const CATEGORY_SELECT_BASE_SQL = `
    SELECT
        c.id::int AS id,
        c.title,
        c.short_title,
        c.description,
        c.active,
        c.position::int AS position,
        COUNT(q.id)::int AS questions_count,
        COUNT(q.id) FILTER (WHERE q.active = TRUE)::int AS active_questions_count,
        u.id::int AS updated_by_id,
        u.name AS updated_by_name,
        c.updated_at
    FROM Categories c
    LEFT JOIN Questions q ON q.category_id = c.id
    LEFT JOIN Users u ON u.id = c.updated_by
`

const QUESTION_SELECT_BASE_SQL = `
    SELECT
        q.id::int AS id,
        q.category_id::int AS category_id,
        c.title AS category_title,
        q.short_title,
        q.short_description,
        q.question,
        q.answer,
        q.legal_basis,
        COALESCE(
            (
                SELECT array_agg(rd.description ORDER BY rd.position ASC, rd.id ASC)
                FROM RequiredDocuments rd
                WHERE rd.question_id = q.id
            ),
            ARRAY[]::text[]
        ) AS required_documents,
        q.requires_in_person,
        q.in_person_note,
        q.out_of_scope,
        q.llm_allowed,
        q.active,
        q.position::int AS position,
        u.id::int AS updated_by_id,
        u.name AS updated_by_name,
        q.updated_at
    FROM Questions q
    INNER JOIN Categories c ON c.id = q.category_id
    LEFT JOIN Users u ON u.id = q.updated_by
`

async function queryCategoryById(
    client: PoolClient | null,
    id: number,
): Promise<CategoryRecord | null> {
    const sql = `
        ${CATEGORY_SELECT_BASE_SQL}
        WHERE c.id = $1
        GROUP BY c.id, u.id, u.name
    `
    const result = client
        ? await client.query<CategoryRow>(sql, [id])
        : await getPool().query<CategoryRow>(sql, [id])
    const row = result.rows[0]
    return row ? mapCategoryRow(row) : null
}

async function queryQuestionById(
    client: PoolClient | null,
    id: number,
): Promise<QuestionRecord | null> {
    const sql = `
        ${QUESTION_SELECT_BASE_SQL}
        WHERE q.id = $1
    `
    const result = client
        ? await client.query<QuestionRow>(sql, [id])
        : await getPool().query<QuestionRow>(sql, [id])
    const row = result.rows[0]
    return row ? mapQuestionRow(row) : null
}

async function syncQuestionDocuments(
    client: PoolClient,
    questionId: number,
    documents: string[],
): Promise<void> {
    await client.query("DELETE FROM RequiredDocuments WHERE question_id = $1", [questionId])
    for (let idx = 0; idx < documents.length; idx++) {
        await client.query(
            `INSERT INTO RequiredDocuments (question_id, description, position)
             VALUES ($1, $2, $3)`,
            [questionId, documents[idx], idx],
        )
    }
}

export class ContentRepository implements IContentRepository {
    public async listCategories(): Promise<CategoryRecord[]> {
        const result = await getPool().query<CategoryRow>(
            `
            ${CATEGORY_SELECT_BASE_SQL}
            GROUP BY c.id, u.id, u.name
            ORDER BY c.position ASC, c.id ASC
            `,
        )
        return result.rows.map(mapCategoryRow)
    }

    public async findCategoryById(id: number): Promise<CategoryRecord | null> {
        return queryCategoryById(null, id)
    }

    public async existsCategoryWithNormalizedTitle(
        title: string,
        excludeCategoryId?: number,
    ): Promise<boolean> {
        const normalized = normalizeComparisonText(title)
        if (excludeCategoryId !== undefined) {
            const result = await getPool().query<{ exists: boolean }>(
                `
                SELECT EXISTS (
                    SELECT 1
                    FROM Categories c
                    WHERE ${sqlAccentInsensitive("c.title")} = $1
                      AND c.id <> $2
                ) AS exists
                `,
                [normalized, excludeCategoryId],
            )
            return Boolean(result.rows[0]?.exists)
        }

        const result = await getPool().query<{ exists: boolean }>(
            `
            SELECT EXISTS (
                SELECT 1
                FROM Categories c
                WHERE ${sqlAccentInsensitive("c.title")} = $1
            ) AS exists
            `,
            [normalized],
        )
        return Boolean(result.rows[0]?.exists)
    }

    public async createCategory(
        input: CategoryCreateInput,
        actorUserId: number,
    ): Promise<CategoryRecord> {
        return withTransaction(async (client: PoolClient) => {
            const posRes = await client.query<{ next_pos: number }>(
                "SELECT COALESCE(MAX(position) + 1, 0)::int AS next_pos FROM Categories",
            )
            const nextPos = posRes.rows[0]?.next_pos ?? 0

            const inserted = await client.query<{ id: number }>(
                `
                INSERT INTO Categories (title, short_title, description, active, position, seed_key, updated_by, updated_at)
                VALUES ($1, $2, $3, TRUE, $4, NULL, $5, now())
                RETURNING id::int AS id
                `,
                [input.title, input.shortTitle, input.description, nextPos, actorUserId],
            )

            const createdId = inserted.rows[0]!.id
            const record = await queryCategoryById(client, createdId)
            return record!
        })
    }

    public async updateCategory(
        id: number,
        input: CategoryUpdateInput,
        actorUserId: number,
    ): Promise<CategoryRecord | null> {
        return withTransaction(async (client: PoolClient) => {
            const updated = await client.query<{ id: number }>(
                `
                UPDATE Categories
                SET title = $2,
                    short_title = $3,
                    description = $4,
                    active = COALESCE($5, active),
                    updated_by = $6,
                    updated_at = now()
                WHERE id = $1
                RETURNING id::int AS id
                `,
                [
                    id,
                    input.title,
                    input.shortTitle,
                    input.description,
                    input.active ?? null,
                    actorUserId,
                ],
            )

            if ((updated.rowCount ?? 0) === 0) {
                return null
            }

            return queryCategoryById(client, id)
        })
    }

    public async setCategoryActive(
        id: number,
        active: boolean,
        actorUserId: number,
    ): Promise<CategoryRecord | null> {
        return withTransaction(async (client: PoolClient) => {
            const updated = await client.query<{ id: number }>(
                `
                UPDATE Categories
                SET active = $2,
                    updated_by = $3,
                    updated_at = now()
                WHERE id = $1
                RETURNING id::int AS id
                `,
                [id, active, actorUserId],
            )

            if ((updated.rowCount ?? 0) === 0) {
                return null
            }

            return queryCategoryById(client, id)
        })
    }

    public async reorderCategories(
        categoryIds: number[],
        actorUserId: number,
    ): Promise<CategoryRecord[]> {
        return withTransaction(async (client: PoolClient) => {
            for (let idx = 0; idx < categoryIds.length; idx++) {
                await client.query(
                    `
                    UPDATE Categories
                    SET position = $2,
                        updated_by = CASE WHEN position IS DISTINCT FROM $2 THEN $3 ELSE updated_by END,
                        updated_at = CASE WHEN position IS DISTINCT FROM $2 THEN now() ELSE updated_at END
                    WHERE id = $1
                    `,
                    [categoryIds[idx], idx, actorUserId],
                )
            }

            const result = await client.query<CategoryRow>(
                `
                ${CATEGORY_SELECT_BASE_SQL}
                GROUP BY c.id, u.id, u.name
                ORDER BY c.position ASC, c.id ASC
                `,
            )
            return result.rows.map(mapCategoryRow)
        })
    }

    public async listQuestionsByCategory(categoryId: number): Promise<QuestionRecord[]> {
        const result = await getPool().query<QuestionRow>(
            `
            ${QUESTION_SELECT_BASE_SQL}
            WHERE q.category_id = $1
            ORDER BY q.position ASC, q.id ASC
            `,
            [categoryId],
        )
        return result.rows.map(mapQuestionRow)
    }

    public async searchQuestions(searchTerm: string): Promise<QuestionRecord[]> {
        const normalizedTerm = normalizeComparisonText(searchTerm)
        const likePattern = `%${escapeLikePattern(normalizedTerm)}%`

        const result = await getPool().query<QuestionRow>(
            `
            ${QUESTION_SELECT_BASE_SQL}
            WHERE ${sqlAccentInsensitive("q.question")} LIKE $1 ESCAPE '\\'
               OR ${sqlAccentInsensitive("q.answer")} LIKE $1 ESCAPE '\\'
               OR ${sqlAccentInsensitive("q.short_title")} LIKE $1 ESCAPE '\\'
            ORDER BY c.position ASC, c.id ASC, q.position ASC, q.id ASC
            `,
            [likePattern],
        )
        return result.rows.map(mapQuestionRow)
    }

    public async findQuestionById(id: number): Promise<QuestionRecord | null> {
        return queryQuestionById(null, id)
    }

    public async createQuestion(
        input: QuestionWriteInput,
        actorUserId: number,
    ): Promise<QuestionRecord> {
        return withTransaction(async (client: PoolClient) => {
            const posRes = await client.query<{ next_pos: number }>(
                `
                SELECT COALESCE(MAX(position) + 1, 0)::int AS next_pos
                FROM Questions
                WHERE category_id = $1
                `,
                [input.categoryId],
            )
            const nextPos = posRes.rows[0]?.next_pos ?? 0

            const inserted = await client.query<{ id: number }>(
                `
                INSERT INTO Questions (
                    category_id,
                    short_title,
                    short_description,
                    question,
                    answer,
                    legal_basis,
                    requires_in_person,
                    in_person_note,
                    out_of_scope,
                    llm_allowed,
                    active,
                    position,
                    seed_key,
                    updated_by,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, $13, now())
                RETURNING id::int AS id
                `,
                [
                    input.categoryId,
                    input.shortTitle,
                    input.shortDescription,
                    input.question,
                    input.answer,
                    input.legalBasis,
                    input.requiresInPerson,
                    input.inPersonNote,
                    input.outOfScope,
                    input.llmAllowed,
                    input.active,
                    nextPos,
                    actorUserId,
                ],
            )

            const createdId = inserted.rows[0]!.id
            await syncQuestionDocuments(client, createdId, input.requiredDocuments)

            const record = await queryQuestionById(client, createdId)
            return record!
        })
    }

    public async updateQuestion(
        id: number,
        input: QuestionWriteInput,
        actorUserId: number,
    ): Promise<QuestionRecord | null> {
        return withTransaction(async (client: PoolClient) => {
            const updated = await client.query<{ id: number }>(
                `
                UPDATE Questions
                SET category_id = $2,
                    short_title = $3,
                    short_description = $4,
                    question = $5,
                    answer = $6,
                    legal_basis = $7,
                    requires_in_person = $8,
                    in_person_note = $9,
                    out_of_scope = $10,
                    llm_allowed = $11,
                    active = $12,
                    updated_by = $13,
                    updated_at = now()
                WHERE id = $1
                RETURNING id::int AS id
                `,
                [
                    id,
                    input.categoryId,
                    input.shortTitle,
                    input.shortDescription,
                    input.question,
                    input.answer,
                    input.legalBasis,
                    input.requiresInPerson,
                    input.inPersonNote,
                    input.outOfScope,
                    input.llmAllowed,
                    input.active,
                    actorUserId,
                ],
            )

            if ((updated.rowCount ?? 0) === 0) {
                return null
            }

            await syncQuestionDocuments(client, id, input.requiredDocuments)
            return queryQuestionById(client, id)
        })
    }

    public async setQuestionActive(
        id: number,
        active: boolean,
        actorUserId: number,
    ): Promise<QuestionRecord | null> {
        return withTransaction(async (client: PoolClient) => {
            const updated = await client.query<{ id: number }>(
                `
                UPDATE Questions
                SET active = $2,
                    updated_by = $3,
                    updated_at = now()
                WHERE id = $1
                RETURNING id::int AS id
                `,
                [id, active, actorUserId],
            )

            if ((updated.rowCount ?? 0) === 0) {
                return null
            }

            return queryQuestionById(client, id)
        })
    }

    public async reorderQuestions(
        categoryId: number,
        questionIds: number[],
        actorUserId: number,
    ): Promise<QuestionRecord[]> {
        return withTransaction(async (client: PoolClient) => {
            for (let idx = 0; idx < questionIds.length; idx++) {
                await client.query(
                    `
                    UPDATE Questions
                    SET position = $3,
                        updated_by = CASE WHEN position IS DISTINCT FROM $3 THEN $4 ELSE updated_by END,
                        updated_at = CASE WHEN position IS DISTINCT FROM $3 THEN now() ELSE updated_at END
                    WHERE id = $1 AND category_id = $2
                    `,
                    [questionIds[idx], categoryId, idx, actorUserId],
                )
            }

            const result = await client.query<QuestionRow>(
                `
                ${QUESTION_SELECT_BASE_SQL}
                WHERE q.category_id = $1
                ORDER BY q.position ASC, q.id ASC
                `,
                [categoryId],
            )
            return result.rows.map(mapQuestionRow)
        })
    }
}

export const contentRepository = new ContentRepository()
export default contentRepository
