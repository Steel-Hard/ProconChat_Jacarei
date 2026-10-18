import { Pool, PoolClient } from "pg"
import getPool from "../db/connection"
import NotFoundError from "../errors/NotFoundError"
import { decideTransition } from "../services/appointmentTransitions"
import {
    AppointmentActionType,
    AppointmentChipCounts,
    AppointmentDetail,
    AppointmentEventItem,
    AppointmentListFilters,
    AppointmentListItem,
    AppointmentStatus,
    ConversationTimelineStep,
} from "../types/appointment.types"
import { cleanCpf, hashCpf } from "../utils/cpf.utils"
import {
    getThisWeekBounds,
    getTodayBounds,
    isDatetimePast,
} from "../utils/date.utils"
import { AppointmentRepository } from "./appointment.repository.interface"

const MAX_BIGINT = 9223372036854775807n
const CPF_SEARCH_PATTERN = /^[\d.\-\s]+$/

async function lockAndDecide(
    client: PoolClient,
    action: AppointmentActionType,
    id: string,
    now: Date,
): Promise<{ status: AppointmentStatus }> {
    const check = await client.query<{ status: AppointmentStatus; appointment_datetime: Date }>(
        "SELECT id, status, assigned_user_id, appointment_datetime FROM Appointments WHERE id = $1 FOR UPDATE",
        [id],
    )
    const current = check.rows[0]
    if (!current) {
        throw new NotFoundError("Agendamento não encontrado")
    }

    const decision = decideTransition(
        action,
        { status: current.status, appointmentDatetime: new Date(current.appointment_datetime) },
        now,
    )
    if (!decision.allowed) {
        throw decision.error
    }
    return current
}

export function createAppointmentRepository(pool: Pool = getPool()): AppointmentRepository {
    return {
        async countPending(): Promise<number> {
            const result = await pool.query<{ count: string }>(
                `SELECT COUNT(*)::text as count FROM Appointments WHERE status = 'PENDING'`,
            )
            return Number(result.rows[0]?.count ?? 0)
        },

        async getCurrentDocumentsConfig(
            byRepresentative: boolean,
            questionId: number,
        ): Promise<{ group: string[]; question: string[] }> {
            const groupEnum = byRepresentative ? "REPRESENTATIVE" : "HOLDER"
            const groupResult = await pool.query<{ description: string }>(
                `SELECT description
                 FROM AttendanceDocuments
                 WHERE attendee_group = $1
                 ORDER BY position ASC, id ASC`,
                [groupEnum],
            )

            const questionResult = await pool.query<{ description: string }>(
                `SELECT description
                 FROM RequiredDocuments
                 WHERE question_id = $1
                 ORDER BY position ASC, id ASC`,
                [questionId],
            )

            return {
                group: groupResult.rows.map((r) => r.description),
                question: questionResult.rows.map((r) => r.description),
            }
        },

        async findById(idOrCode: number | string): Promise<AppointmentDetail | null> {
            const idStr = String(idOrCode).trim()
            if (!/^\d+$/.test(idStr)) {
                return null
            }

            try {
                const n = BigInt(idStr)
                if (n <= 0n || n > MAX_BIGINT) {
                    return null
                }
            } catch {
                return null
            }

            const query = `
                SELECT
                    a.id,
                    a.appointment_code,
                    UPPER(SUBSTRING(a.appointment_code::text, 1, 8)) as protocol,
                    a.session_id,
                    a.status,
                    a.name,
                    a.cpf_masked,
                    a.by_representative,
                    a.reason,
                    a.appointment_datetime,
                    a.rescheduled_from,
                    a.off_grid,
                    a.request_datetime,
                    a.assigned_user_id,
                    u.name as assigned_user_name,
                    c.id as category_id,
                    c.title as category_name,
                    q.id as question_id,
                    COALESCE(q.short_title, q.question) as question_title,
                    a.documents_sent
                FROM Appointments a
                JOIN Questions q ON q.id = a.question_id
                JOIN Categories c ON c.id = q.category_id
                LEFT JOIN Users u ON u.id = a.assigned_user_id
                WHERE a.id = $1
            `

            const result = await pool.query(query, [idStr])
            const row = result.rows[0]
            if (!row) {
                return null
            }

            const currentDocs = await this.getCurrentDocumentsConfig(
                row.by_representative,
                Number(row.question_id),
            )

            const docsSent = row.documents_sent as {
                group?: string[]
                question?: string[]
            }
            const groupSent = docsSent.group || []
            const questionSent = docsSent.question || []

            const isGroupDiff =
                JSON.stringify(groupSent.slice().sort()) !==
                JSON.stringify(currentDocs.group.slice().sort())
            const isQuestionDiff =
                JSON.stringify(questionSent.slice().sort()) !==
                JSON.stringify(currentDocs.question.slice().sort())
            const isDifferent = isGroupDiff || isQuestionDiff

            const eventsResult = await pool.query(
                `SELECT
                     e.id,
                     e.type,
                     e.actor_user_id,
                     u.name as actor_user_name,
                     e.data,
                     e.created_at
                 FROM AppointmentEvents e
                 LEFT JOIN Users u ON u.id = e.actor_user_id
                 WHERE e.appointment_id = $1
                 ORDER BY e.created_at DESC, e.id DESC`,
                [row.id],
            )

            const events: AppointmentEventItem[] = eventsResult.rows.map((e) => ({
                id: e.id.toString(),
                type: e.type,
                actor_user_id: e.actor_user_id ? e.actor_user_id.toString() : null,
                actor_user_name: e.actor_user_name,
                data: e.data || {},
                created_at: new Date(e.created_at).toISOString(),
            }))

            const timeline: ConversationTimelineStep[] = []

            return {
                id: row.id.toString(),
                appointment_code: row.appointment_code,
                protocol: row.protocol,
                session_id: row.session_id.toString(),
                status: row.status,
                name: row.name,
                cpf_masked: row.cpf_masked,
                by_representative: row.by_representative,
                reason: row.reason,
                appointment_datetime: new Date(row.appointment_datetime).toISOString(),
                rescheduled_from: row.rescheduled_from
                    ? new Date(row.rescheduled_from).toISOString()
                    : null,
                off_grid: row.off_grid,
                request_datetime: new Date(row.request_datetime).toISOString(),
                assigned_user_id: row.assigned_user_id
                    ? row.assigned_user_id.toString()
                    : null,
                assigned_user_name: row.assigned_user_name,
                category_id: row.category_id.toString(),
                category_name: row.category_name,
                question_id: row.question_id.toString(),
                question_title: row.question_title,
                documents_sent: {
                    group: groupSent,
                    question: questionSent,
                },
                is_documents_config_different: isDifferent,
                events,
                timeline,
            }
        },

        async findList(
            filters: AppointmentListFilters,
            now: Date = new Date(),
        ): Promise<{
            items: AppointmentListItem[]
            total: number
            chipCounts: AppointmentChipCounts
        }> {
            const chipResult = await pool.query<{
                all: string
                pending: string
                confirmed: string
                attended: string
                no_show: string
                canceled: string
                waiting_record: string
            }>(
                `SELECT
                     COUNT(*)::text as all,
                     COUNT(*) FILTER (WHERE status = 'PENDING')::text as pending,
                     COUNT(*) FILTER (WHERE status = 'CONFIRMED')::text as confirmed,
                     COUNT(*) FILTER (WHERE status = 'ATTENDED')::text as attended,
                     COUNT(*) FILTER (WHERE status = 'NO_SHOW')::text as no_show,
                     COUNT(*) FILTER (WHERE status = 'CANCELED')::text as canceled,
                     COUNT(*) FILTER (WHERE status = 'CONFIRMED' AND appointment_datetime < $1)::text as waiting_record
                 FROM Appointments`,
                [now],
            )

            const chipRow = chipResult.rows[0]
            const chipCounts: AppointmentChipCounts = {
                all: Number(chipRow?.all ?? 0),
                pending: Number(chipRow?.pending ?? 0),
                confirmed: Number(chipRow?.confirmed ?? 0),
                attended: Number(chipRow?.attended ?? 0),
                no_show: Number(chipRow?.no_show ?? 0),
                canceled: Number(chipRow?.canceled ?? 0),
                waiting_record: Number(chipRow?.waiting_record ?? 0),
            }

            const conditions: string[] = []
            const params: unknown[] = []
            let paramIndex = 1

            const isSearching = Boolean(filters.search && filters.search.trim().length > 0)

            if (isSearching) {
                const term = filters.search!.trim()
                const cleanedDigits = cleanCpf(term)

                if (CPF_SEARCH_PATTERN.test(term) && cleanedDigits.length === 11) {
                    const cpfHashed = hashCpf(cleanedDigits)
                    conditions.push(`a.cpf_hash = $${paramIndex++}`)
                    params.push(cpfHashed)
                } else {
                    const escaped = term.replace(/([%_\\])/g, "\\$1")
                    const nameParam = `%${escaped}%`
                    const codeParam = `${escaped}%`
                    conditions.push(
                        `(unaccent(LOWER(a.name)) LIKE unaccent(LOWER($${paramIndex})) ESCAPE '\\' OR a.appointment_code::text ILIKE $${paramIndex + 1} ESCAPE '\\')`,
                    )
                    params.push(nameParam, codeParam)
                    paramIndex += 2
                }
            } else {
                if (filters.status && filters.status !== "all") {
                    if (filters.status === "waiting_record") {
                        conditions.push(
                            `a.status = 'CONFIRMED' AND a.appointment_datetime < $${paramIndex++}`,
                        )
                        params.push(now)
                    } else {
                        conditions.push(`a.status = $${paramIndex++}`)
                        params.push(filters.status)
                    }
                }

                if (filters.period && filters.period !== "all") {
                    const todayBounds = getTodayBounds(now)
                    const weekBounds = getThisWeekBounds(now)

                    if (filters.period === "today") {
                        conditions.push(
                            `a.appointment_datetime >= $${paramIndex++} AND a.appointment_datetime <= $${paramIndex++}`,
                        )
                        params.push(todayBounds.start, todayBounds.end)
                    } else if (filters.period === "this_week") {
                        conditions.push(
                            `a.appointment_datetime >= $${paramIndex++} AND a.appointment_datetime <= $${paramIndex++}`,
                        )
                        params.push(weekBounds.start, weekBounds.end)
                    } else if (filters.period === "upcoming") {
                        conditions.push(`a.appointment_datetime >= $${paramIndex++}`)
                        params.push(todayBounds.start)
                    } else if (filters.period === "past") {
                        conditions.push(`a.appointment_datetime < $${paramIndex++}`)
                        params.push(todayBounds.start)
                    }
                }

                if (filters.responsible && filters.responsible !== "all") {
                    if (filters.responsible === "unassigned") {
                        conditions.push(`a.assigned_user_id IS NULL`)
                    } else if (filters.responsible === "me" && filters.currentUserId) {
                        conditions.push(`a.assigned_user_id = $${paramIndex++}`)
                        params.push(filters.currentUserId)
                    } else if (/^\d+$/.test(filters.responsible)) {
                        conditions.push(`a.assigned_user_id = $${paramIndex++}`)
                        params.push(Number(filters.responsible))
                    }
                }
            }

            const whereClause =
                conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

            const countQuery = `
                SELECT COUNT(*)::text as count
                FROM Appointments a
                ${whereClause}
            `
            const countResult = await pool.query<{ count: string }>(countQuery, params)
            const total = Number(countResult.rows[0]?.count ?? 0)

            let orderByClause = ""
            const sortBy = filters.sortBy
            const sortOrder = filters.sortOrder

            if (sortBy) {
                const orderDir = sortOrder === "desc" ? "DESC" : "ASC"
                if (sortBy === "name") {
                    orderByClause = `ORDER BY a.name ${orderDir}, a.appointment_datetime ASC, a.id ASC`
                } else if (sortBy === "appointment_datetime") {
                    orderByClause = `ORDER BY a.appointment_datetime ${orderDir}, a.id ASC`
                } else if (sortBy === "responsible") {
                    orderByClause =
                        orderDir === "ASC"
                            ? `ORDER BY u.name ASC NULLS FIRST, a.appointment_datetime ASC, a.id ASC`
                            : `ORDER BY u.name DESC NULLS LAST, a.appointment_datetime ASC, a.id ASC`
                } else if (sortBy === "status") {
                    orderByClause = `ORDER BY a.status ${orderDir}, a.appointment_datetime ASC, a.id ASC`
                }
            } else if (isSearching) {
                orderByClause = `
                    ORDER BY
                        CASE WHEN a.appointment_datetime >= $${paramIndex} THEN 0 ELSE 1 END ASC,
                        CASE WHEN a.appointment_datetime >= $${paramIndex} THEN a.appointment_datetime END ASC,
                        a.appointment_datetime DESC,
                        a.id ASC
                `
                params.push(now)
                paramIndex++
            } else if (filters.status && filters.status !== "all") {
                if (
                    filters.status === "CANCELED" ||
                    filters.status === "ATTENDED" ||
                    filters.status === "NO_SHOW"
                ) {
                    orderByClause = `ORDER BY a.appointment_datetime DESC, a.id DESC`
                } else {
                    orderByClause = `ORDER BY a.appointment_datetime ASC, a.id ASC`
                }
            } else if (
                filters.period === "today" ||
                filters.period === "this_week" ||
                filters.period === "upcoming"
            ) {
                orderByClause = `ORDER BY a.appointment_datetime ASC, a.id ASC`
            } else if (filters.period === "past") {
                orderByClause = `ORDER BY a.appointment_datetime DESC, a.id DESC`
            } else {
                orderByClause = `
                    ORDER BY
                        CASE WHEN a.appointment_datetime >= $${paramIndex} THEN 0 ELSE 1 END ASC,
                        CASE WHEN a.appointment_datetime >= $${paramIndex} THEN a.appointment_datetime END ASC,
                        a.appointment_datetime DESC,
                        a.id ASC
                `
                params.push(now)
                paramIndex++
            }

            const page = filters.page || 1
            const limit = filters.limit || 20
            const offset = (page - 1) * limit

            const listQuery = `
                SELECT
                    a.id,
                    a.appointment_code,
                    UPPER(SUBSTRING(a.appointment_code::text, 1, 8)) as protocol,
                    a.name,
                    a.cpf_masked,
                    c.title as category_name,
                    COALESCE(q.short_title, q.question) as question_title,
                    a.appointment_datetime,
                    a.by_representative,
                    a.assigned_user_id,
                    u.name as assigned_user_name,
                    a.status,
                    a.off_grid
                FROM Appointments a
                JOIN Questions q ON q.id = a.question_id
                JOIN Categories c ON c.id = q.category_id
                LEFT JOIN Users u ON u.id = a.assigned_user_id
                ${whereClause}
                ${orderByClause}
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `
            params.push(limit, offset)

            const listResult = await pool.query(listQuery, params)

            const items: AppointmentListItem[] = listResult.rows.map((r) => ({
                id: r.id.toString(),
                protocol: r.protocol,
                appointment_code: r.appointment_code,
                name: r.name,
                cpf_masked: r.cpf_masked,
                category_name: r.category_name,
                question_title: r.question_title,
                appointment_datetime: new Date(r.appointment_datetime).toISOString(),
                by_representative: r.by_representative,
                assigned_user_id: r.assigned_user_id
                    ? r.assigned_user_id.toString()
                    : null,
                assigned_user_name: r.assigned_user_name,
                status: r.status,
                off_grid: r.off_grid,
                waiting_record:
                    r.status === "CONFIRMED" &&
                    isDatetimePast(new Date(r.appointment_datetime), now),
            }))

            return {
                items,
                total,
                chipCounts,
            }
        },

        async claim(
            id: string,
            actorUserId: number,
            now: Date = new Date(),
        ): Promise<void> {
            const client = await pool.connect()
            try {
                await client.query("BEGIN")

                await lockAndDecide(client, "claim", id, now)

                await client.query(
                    `UPDATE Appointments
                     SET status = 'CONFIRMED', assigned_user_id = $1
                     WHERE id = $2`,
                    [actorUserId, id],
                )

                await client.query(
                    `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                     VALUES ($1, 'CLAIMED', $2, '{}'::jsonb, $3)`,
                    [id, actorUserId, now],
                )

                await client.query("COMMIT")
            } catch (err) {
                await client.query("ROLLBACK")
                throw err
            } finally {
                client.release()
            }
        },

        async markAttended(
            id: string,
            actorUserId: number,
            now: Date = new Date(),
        ): Promise<void> {
            const client = await pool.connect()
            try {
                await client.query("BEGIN")

                const current = await lockAndDecide(client, "attended", id, now)

                const isAutoClaim = current.status === "PENDING"
                if (isAutoClaim) {
                    await client.query(
                        `UPDATE Appointments
                         SET status = 'CONFIRMED', assigned_user_id = $1
                         WHERE id = $2`,
                        [actorUserId, id],
                    )

                    await client.query(
                        `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                         VALUES ($1, 'CLAIMED', $2, '{"auto_claimed": true}'::jsonb, $3)`,
                        [id, actorUserId, now],
                    )
                }

                await client.query(
                    `UPDATE Appointments
                     SET status = 'ATTENDED',
                         assigned_user_id = COALESCE(assigned_user_id, $1)
                     WHERE id = $2`,
                    [actorUserId, id],
                )

                await client.query(
                    `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                     VALUES ($1, 'ATTENDED', $2, '{}'::jsonb, $3)`,
                    [id, actorUserId, now],
                )

                await client.query("COMMIT")
            } catch (err) {
                await client.query("ROLLBACK")
                throw err
            } finally {
                client.release()
            }
        },

        async markNoShow(
            id: string,
            actorUserId: number,
            now: Date = new Date(),
        ): Promise<void> {
            const client = await pool.connect()
            try {
                await client.query("BEGIN")

                const current = await lockAndDecide(client, "no_show", id, now)

                const isAutoClaim = current.status === "PENDING"
                if (isAutoClaim) {
                    await client.query(
                        `UPDATE Appointments
                         SET status = 'CONFIRMED', assigned_user_id = $1
                         WHERE id = $2`,
                        [actorUserId, id],
                    )

                    await client.query(
                        `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                         VALUES ($1, 'CLAIMED', $2, '{"auto_claimed": true}'::jsonb, $3)`,
                        [id, actorUserId, now],
                    )
                }

                await client.query(
                    `UPDATE Appointments
                     SET status = 'NO_SHOW',
                         assigned_user_id = COALESCE(assigned_user_id, $1)
                     WHERE id = $2`,
                    [actorUserId, id],
                )

                await client.query(
                    `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                     VALUES ($1, 'NO_SHOW', $2, '{}'::jsonb, $3)`,
                    [id, actorUserId, now],
                )

                await client.query("COMMIT")
            } catch (err) {
                await client.query("ROLLBACK")
                throw err
            } finally {
                client.release()
            }
        },

        async resolveTitles(
            categoryIds: number[],
            questionIds: number[],
        ): Promise<{
            categories: Record<number, string>
            questions: Record<number, string>
        }> {
            const categories: Record<number, string> = {}
            const questions: Record<number, string> = {}

            if (categoryIds.length > 0) {
                const catResult = await pool.query<{ id: string; title: string }>(
                    `SELECT id, title FROM Categories WHERE id = ANY($1::bigint[])`,
                    [categoryIds],
                )
                for (const row of catResult.rows) {
                    categories[Number(row.id)] = row.title
                }
            }

            if (questionIds.length > 0) {
                const qResult = await pool.query<{ id: string; question: string; short_title: string | null }>(
                    `SELECT id, question, short_title FROM Questions WHERE id = ANY($1::bigint[])`,
                    [questionIds],
                )
                for (const row of qResult.rows) {
                    questions[Number(row.id)] = row.short_title ?? row.question
                }
            }

            return { categories, questions }
        },
    }
}

export const appointmentRepository = createAppointmentRepository()
export default appointmentRepository
