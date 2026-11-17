import { Pool } from "pg"
import getPool from "../db/connection"
import InternalServerError from "../errors/InternalServerError"
import {
    DocumentsConfigData,
    DocumentsLastChange,
    DocumentsSettingsContext,
    IDocumentsRepository,
    SampleQuestionRow
} from "./documents.repository.interface"

const REMOVED_USER_NAME = "usuário removido"

export class DocumentsRepository implements IDocumentsRepository {
    private pool: Pool

    constructor(pool: Pool = getPool()) {
        this.pool = pool
    }

    private async readConfig(db: Pick<Pool, "query">): Promise<DocumentsConfigData> {
        const result = await db.query<{
            attendee_group: "HOLDER" | "REPRESENTATIVE"
            description: string
        }>(
            `SELECT attendee_group, description
             FROM AttendanceDocuments
             ORDER BY position ASC, id ASC`
        )

        const holder: string[] = []
        const representative: string[] = []

        for (const row of result.rows) {
            if (row.attendee_group === "HOLDER") {
                holder.push(row.description)
            } else {
                representative.push(row.description)
            }
        }

        return { holder, representative }
    }

    async getDocumentsConfig(): Promise<DocumentsConfigData> {
        return this.readConfig(this.pool)
    }

    async getLastChange(): Promise<DocumentsLastChange | null> {
        const result = await this.pool.query<{
            created_at: Date
            user_id: string | null
            user_name: string | null
        }>(
            `SELECT a.created_at, u.id as user_id, u.name as user_name
             FROM AuditLog a
             LEFT JOIN Users u ON u.id = a.actor_user_id
             WHERE a.area = 'documents'
             ORDER BY a.created_at DESC, a.id DESC
             LIMIT 1`
        )

        const row = result.rows[0]
        if (!row) {
            return null
        }

        return {
            id: row.user_id === null ? null : Number(row.user_id),
            name: row.user_name ?? REMOVED_USER_NAME,
            at: new Date(row.created_at).toISOString()
        }
    }

    async getScheduleContext(): Promise<DocumentsSettingsContext> {
        const result = await this.pool.query<{
            unit_address: string
            unit_address_complement: string | null
            reminder_enabled: boolean
            reminder_hours: number
        }>(
            `SELECT unit_address, unit_address_complement, reminder_enabled, reminder_hours
             FROM ScheduleSettings
             WHERE id = 1`
        )

        const row = result.rows[0]
        if (!row) {
            throw new InternalServerError("Configuração de horários de atendimento não encontrada")
        }

        return {
            unitAddress: row.unit_address,
            unitAddressComplement: row.unit_address_complement,
            reminderEnabled: row.reminder_enabled,
            reminderHours: row.reminder_hours
        }
    }

    async getSampleQuestions(): Promise<SampleQuestionRow[]> {
        const qResult = await this.pool.query<{
            id: string
            title: string
            category_title: string
        }>(
            `SELECT q.id, COALESCE(q.short_title, q.question) as title, c.title as category_title
             FROM Questions q
             INNER JOIN Categories c ON c.id = q.category_id
             WHERE q.active = TRUE AND c.active = TRUE
             ORDER BY c.position ASC, c.id ASC, q.position ASC, q.id ASC`
        )

        if (qResult.rows.length === 0) {
            return []
        }

        const questionIds = qResult.rows.map((r) => Number(r.id))
        const docsResult = await this.pool.query<{
            question_id: string
            description: string
        }>(
            `SELECT question_id, description
             FROM RequiredDocuments
             WHERE question_id = ANY($1::bigint[])
             ORDER BY position ASC, id ASC`,
            [questionIds]
        )

        const docsByQuestion: Record<string, string[]> = {}
        for (const row of docsResult.rows) {
            const qId = String(row.question_id)
            if (!docsByQuestion[qId]) {
                docsByQuestion[qId] = []
            }
            docsByQuestion[qId]!.push(row.description)
        }

        return qResult.rows.map((q) => ({
            id: String(q.id),
            title: q.title,
            categoryTitle: q.category_title,
            documents: docsByQuestion[String(q.id)] ?? []
        }))
    }

    async getQuestionDocuments(questionId: number): Promise<string[] | null> {
        const question = await this.pool.query(
            `SELECT 1
             FROM Questions q
             INNER JOIN Categories c ON c.id = q.category_id
             WHERE q.id = $1 AND q.active = TRUE AND c.active = TRUE`,
            [questionId]
        )
        if (question.rows.length === 0) {
            return null
        }

        const result = await this.pool.query<{ description: string }>(
            `SELECT description
             FROM RequiredDocuments
             WHERE question_id = $1
             ORDER BY position ASC, id ASC`,
            [questionId]
        )
        return result.rows.map((r) => r.description)
    }

    async saveDocumentsConfig(
        data: DocumentsConfigData,
        actorUserId: number
    ): Promise<void> {
        const client = await this.pool.connect()
        try {
            await client.query("BEGIN")

            const current = await this.readConfig(client)
            if (JSON.stringify(current) === JSON.stringify(data)) {
                await client.query("ROLLBACK")
                return
            }

            await client.query("DELETE FROM AttendanceDocuments")

            for (let i = 0; i < data.holder.length; i++) {
                await client.query(
                    `INSERT INTO AttendanceDocuments (attendee_group, description, position)
                     VALUES ('HOLDER', $1, $2)`,
                    [data.holder[i], i]
                )
            }

            for (let i = 0; i < data.representative.length; i++) {
                await client.query(
                    `INSERT INTO AttendanceDocuments (attendee_group, description, position)
                     VALUES ('REPRESENTATIVE', $1, $2)`,
                    [data.representative[i], i]
                )
            }

            await client.query(
                `INSERT INTO AuditLog (area, action, actor_user_id, data)
                 VALUES ('documents', 'documents_updated', $1, $2::jsonb)`,
                [actorUserId, JSON.stringify(data)]
            )

            await client.query("COMMIT")
        } catch (error) {
            await client.query("ROLLBACK")
            throw error
        } finally {
            client.release()
        }
    }
}

export const documentsRepository = new DocumentsRepository()
