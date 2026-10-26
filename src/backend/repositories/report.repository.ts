import { Pool } from "pg"
import getPool from "../db/connection"
import type { AbandonedStep } from "../types/conversationEvent.types"
import type {
    AbandonedStepCountRow,
    AppointmentsResultCounts,
    CategoryUsageItem,
    DailyConversationRow,
    OutcomeCountRow,
    QuestionUsageItem,
    SessionOutcome,
} from "../types/report.types"
import { IReportRepository } from "./report.repository.interface"

const DEFAULT_TOP_QUESTIONS_LIMIT = 10

export function createReportRepository(
    pool: Pool = getPool(),
): IReportRepository {
    return {
        async getOutcomesCount(
            start: Date,
            endExclusive: Date,
        ): Promise<OutcomeCountRow[]> {
            const result = await pool.query<{
                outcome: SessionOutcome
                count: string
            }>(
                `SELECT
                     s.outcome AS outcome,
                     COUNT(*)::text AS count
                 FROM Sessions s
                 WHERE s.started_at >= $1
                   AND s.started_at < $2
                 GROUP BY s.outcome
                 ORDER BY s.outcome ASC`,
                [start, endExclusive],
            )
            return result.rows.map((row) => ({
                outcome: row.outcome,
                count: Number(row.count),
            }))
        },

        async getDailyConversations(
            start: Date,
            endExclusive: Date,
        ): Promise<DailyConversationRow[]> {
            const result = await pool.query<{
                date: string
                conversations: string
                appointments_created: string
            }>(
                `SELECT
                     to_char(s.started_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS date,
                     COUNT(*)::text AS conversations,
                     COUNT(*) FILTER (
                         WHERE s.outcome = 'SCHEDULED'
                            OR EXISTS (
                                SELECT 1 FROM Appointments a WHERE a.session_id = s.id
                            )
                     )::text AS appointments_created
                 FROM Sessions s
                 WHERE s.started_at >= $1
                   AND s.started_at < $2
                 GROUP BY 1
                 ORDER BY 1 ASC`,
                [start, endExclusive],
            )
            return result.rows.map((row) => ({
                date: row.date,
                conversations: Number(row.conversations),
                appointmentsCreated: Number(row.appointments_created),
            }))
        },

        async getTopCategories(
            start: Date,
            endExclusive: Date,
        ): Promise<CategoryUsageItem[]> {
            const result = await pool.query<{
                category_id: string
                title: string
                conversations_count: string
            }>(
                `SELECT
                     c.id::text AS category_id,
                     c.title AS title,
                     COUNT(DISTINCT ce.session_id)::text AS conversations_count
                 FROM ConversationEvents ce
                 JOIN Sessions s ON s.id = ce.session_id
                 JOIN Categories c ON c.id = ce.category_id
                 WHERE ce.type = 'CATEGORY_CHOSEN'
                   AND s.started_at >= $1
                   AND s.started_at < $2
                 GROUP BY c.id, c.title, c.position
                 ORDER BY COUNT(DISTINCT ce.session_id) DESC, c.position ASC, c.id ASC`,
                [start, endExclusive],
            )
            return result.rows.map((row) => ({
                categoryId: String(row.category_id),
                title: row.title,
                conversationsCount: Number(row.conversations_count),
            }))
        },

        async getTopQuestions(
            start: Date,
            endExclusive: Date,
            limit: number = DEFAULT_TOP_QUESTIONS_LIMIT,
        ): Promise<QuestionUsageItem[]> {
            const result = await pool.query<{
                question_id: string
                question: string
                short_title: string | null
                category_id: string
                category_title: string
                conversations_count: string
            }>(
                `SELECT
                     q.id::text AS question_id,
                     q.question AS question,
                     q.short_title AS short_title,
                     c.id::text AS category_id,
                     c.title AS category_title,
                     COUNT(DISTINCT ce.session_id)::text AS conversations_count
                 FROM ConversationEvents ce
                 JOIN Sessions s ON s.id = ce.session_id
                 JOIN Questions q ON q.id = ce.question_id
                 JOIN Categories c ON c.id = q.category_id
                 WHERE ce.type = 'QUESTION_CHOSEN'
                   AND s.started_at >= $1
                   AND s.started_at < $2
                 GROUP BY q.id, q.question, q.short_title, q.position, c.id, c.title, c.position
                 ORDER BY COUNT(DISTINCT ce.session_id) DESC, c.position ASC, q.position ASC, q.id ASC
                 LIMIT $3`,
                [start, endExclusive, limit],
            )
            return result.rows.map((row) => ({
                questionId: String(row.question_id),
                question: row.question,
                shortTitle: row.short_title,
                categoryId: String(row.category_id),
                categoryTitle: row.category_title,
                conversationsCount: Number(row.conversations_count),
            }))
        },

        async getAppointmentsResultCounts(
            start: Date,
            endExclusive: Date,
            now: Date = new Date(),
        ): Promise<AppointmentsResultCounts> {
            const result = await pool.query<{
                attended: string
                no_show: string
                canceled: string
                waiting_record: string
                upcoming: string
            }>(
                `SELECT
                     COUNT(*) FILTER (WHERE a.status = 'ATTENDED')::text AS attended,
                     COUNT(*) FILTER (WHERE a.status = 'NO_SHOW')::text AS no_show,
                     COUNT(*) FILTER (WHERE a.status = 'CANCELED')::text AS canceled,
                     COUNT(*) FILTER (
                         WHERE a.status = 'CONFIRMED'
                           AND a.appointment_datetime <= $3
                     )::text AS waiting_record,
                     COUNT(*) FILTER (
                         WHERE a.status = 'PENDING'
                            OR (a.status = 'CONFIRMED' AND a.appointment_datetime > $3)
                     )::text AS upcoming
                 FROM Appointments a
                 WHERE a.appointment_datetime >= $1
                   AND a.appointment_datetime < $2`,
                [start, endExclusive, now],
            )
            const row = result.rows[0]
            return {
                attended: Number(row?.attended ?? 0),
                noShow: Number(row?.no_show ?? 0),
                canceled: Number(row?.canceled ?? 0),
                waitingRecord: Number(row?.waiting_record ?? 0),
                upcoming: Number(row?.upcoming ?? 0),
            }
        },

        async getAbandonedByStep(
            start: Date,
            endExclusive: Date,
        ): Promise<AbandonedStepCountRow[]> {
            const result = await pool.query<{
                step: AbandonedStep
                count: string
            }>(
                `SELECT
                     s.abandoned_at_step AS step,
                     COUNT(*)::text AS count
                 FROM Sessions s
                 WHERE s.started_at >= $1
                   AND s.started_at < $2
                   AND s.outcome = 'ABANDONED'
                   AND s.abandoned_at_step IS NOT NULL
                 GROUP BY s.abandoned_at_step
                 ORDER BY s.abandoned_at_step ASC`,
                [start, endExclusive],
            )
            return result.rows.map((row) => ({
                step: row.step,
                count: Number(row.count),
            }))
        },
    }
}

export const reportRepository: IReportRepository = createReportRepository()
