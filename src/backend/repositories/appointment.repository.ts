import { Pool, PoolClient } from "pg"
import getPool from "../db/connection"
import ConflictError from "../errors/ConflictError"
import NotFoundError from "../errors/NotFoundError"
import { isValidAppointmentId } from "../schemas/appointment.schema"
import { decideTransition, restoredStateAfterCorrection } from "../services/appointmentTransitions"
import {
    countFreeStaff,
    findResponsibleConflict,
    isValidResponsible,
    ResponsibleConflict,
} from "../services/responsibleAvailability"
import type { RuleAccount } from "../types/userAccount.types"
import {
    AppointmentActionType,
    AppointmentChipCounts,
    AppointmentDetailRecord,
    AppointmentEventItem,
    AppointmentListFilters,
    AppointmentListItem,
    AppointmentNote,
    AppointmentStatus,
    CalendarFilters,
    CancellationNoticeTarget,
    CancellationReason,
    CitizenNotificationKind,
    CitizenNotificationOutcome,
    ConversationTimelineStep,
    CorrectionHistoryEvent,
    CorrectionResult,
    CorrectionWarning,
    StaffMember,
    WeekAppointmentRecord,
} from "../types/appointment.types"
import { cleanCpf, hashCpf } from "../utils/cpf.utils"
import {
    getThisWeekBounds,
    getTodayBounds,
    isDatetimePast,
} from "../utils/date.utils"
import { isDocumentsConfigDifferent } from "../utils/documents.utils"
import { AppointmentRepository } from "./appointment.repository.interface"
import { assignAppointment } from "./appointmentReassignment"
import {
    inTransaction,
    lockAccounts,
    orderedPermissions,
    PROTOCOL_SQL,
    readConfirmedAround,
    readSlotMinutes,
} from "./responsibleQueries"

const CPF_SEARCH_PATTERN = /^[\d.\-\s]+$/

interface LockedAppointment {
    id: string
    status: AppointmentStatus
    assigned_user_id: string | null
    appointment_datetime: Date
}

function periodCondition(
    period: AppointmentListFilters["period"],
    now: Date,
    params: unknown[],
): string | null {
    if (!period || period === "all") {
        return null
    }
    const todayBounds = getTodayBounds(now)
    if (period === "today") {
        params.push(todayBounds.start, todayBounds.end)
        return `a.appointment_datetime >= $${params.length - 1} AND a.appointment_datetime <= $${params.length}`
    }
    if (period === "this_week") {
        const weekBounds = getThisWeekBounds(now)
        params.push(weekBounds.start, weekBounds.end)
        return `a.appointment_datetime >= $${params.length - 1} AND a.appointment_datetime <= $${params.length}`
    }
    if (period === "upcoming") {
        params.push(todayBounds.start)
        return `a.appointment_datetime >= $${params.length}`
    }
    params.push(todayBounds.start)
    return `a.appointment_datetime < $${params.length}`
}

function statusCondition(status: AppointmentListFilters["status"], now: Date, params: unknown[]): string | null {
    if (!status || status === "all") {
        return null
    }
    if (status === "waiting_record") {
        params.push(now)
        return `a.status = 'CONFIRMED' AND a.appointment_datetime < $${params.length}`
    }
    params.push(status)
    return `a.status = $${params.length}`
}

function responsibleCondition(filters: AppointmentListFilters, params: unknown[]): string | null {
    const responsible = filters.responsible
    if (!responsible || responsible === "all") {
        return null
    }
    if (responsible === "unassigned") {
        return "a.assigned_user_id IS NULL"
    }
    if (responsible === "me") {
        if (!filters.currentUserId) {
            return null
        }
        params.push(filters.currentUserId)
        return `a.assigned_user_id = $${params.length}`
    }
    if (/^\d+$/.test(responsible)) {
        params.push(Number(responsible))
        return `a.assigned_user_id = $${params.length}`
    }
    return null
}

async function lockAndDecide(
    client: PoolClient,
    action: AppointmentActionType,
    id: string,
    now: Date,
): Promise<LockedAppointment> {
    const check = await client.query<LockedAppointment>(
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

async function readEligibleStaff(client: PoolClient): Promise<RuleAccount[]> {
    const result = await client.query<{ id: string; is_admin: boolean; active: boolean; permissions: string[] }>(
        `SELECT u.id, u.is_admin, u.active,
                COALESCE((SELECT array_agg(up.permission_key::text) FROM UserPermissions up WHERE up.user_id = u.id), '{}') AS permissions
         FROM Users u
         WHERE u.active
           AND (u.is_admin OR EXISTS (
               SELECT 1 FROM UserPermissions up WHERE up.user_id = u.id AND up.permission_key = 'appointments.manage'
           ))`,
    )
    return result.rows.map((row) => ({
        id: Number(row.id),
        isAdmin: row.is_admin,
        active: row.active,
        permissions: orderedPermissions(row.is_admin, row.permissions),
    }))
}

async function readCorrectionHistory(client: PoolClient, id: string): Promise<CorrectionHistoryEvent[]> {
    const result = await client.query<{ id: string; type: CorrectionHistoryEvent["type"]; data: Record<string, unknown>; created_at: Date }>(
        "SELECT id, type, data, created_at FROM AppointmentEvents WHERE appointment_id = $1",
        [id],
    )
    return result.rows.map((row) => ({
        id: String(row.id),
        type: row.type,
        data: row.data ?? {},
        createdAt: new Date(row.created_at),
    }))
}

const RESPONSIBLE_BUSY_MESSAGE =
    "O responsável anterior já tem outro agendamento neste horário. O agendamento voltou para Pendente sem responsável."
const RESPONSIBLE_UNAVAILABLE_MESSAGE =
    "O responsável anterior não pode mais ser responsável por agendamentos. O agendamento voltou para Pendente sem responsável."

async function correctionWarning(
    client: PoolClient,
    appointmentId: string,
    responsibleId: number,
    appointmentDatetime: Date,
    slotMinutes: number | null,
    conflict: ResponsibleConflict,
): Promise<CorrectionWarning> {
    const info = await client.query<{ protocol: string; name: string }>(
        `SELECT ${PROTOCOL_SQL} AS protocol, u.name
         FROM Appointments a, Users u
         WHERE a.id = $1 AND u.id = $2`,
        [appointmentId, responsibleId],
    )
    const row = info.rows[0]
    const eligible = await readEligibleStaff(client)
    const busy = await readConfirmedAround(
        client,
        eligible.map((account) => account.id),
        appointmentDatetime,
        slotMinutes,
    )
    const base = {
        appointmentId,
        protocol: row?.protocol ?? "",
        previousAssignedUserId: String(responsibleId),
        previousAssignedUserName: row?.name ?? "",
    }
    const freeStaffCount = countFreeStaff({ eligible, appointmentDatetime, slotMinutes, busy })
    if (conflict.reason === "BUSY") {
        return {
            code: "RESPONSIBLE_BUSY",
            message: RESPONSIBLE_BUSY_MESSAGE,
            details: {
                ...base,
                conflictingAppointmentId: conflict.appointmentId,
                conflictingProtocol: conflict.protocol,
                freeStaffCount,
            },
        }
    }
    return {
        code: "RESPONSIBLE_UNAVAILABLE",
        message: RESPONSIBLE_UNAVAILABLE_MESSAGE,
        details: { ...base, freeStaffCount },
    }
}

function invalidAssigneeError(): ConflictError {
    return new ConflictError("O funcionário escolhido não pode ser responsável por agendamentos", "INVALID_ASSIGNEE")
}

function assigneeBusyError(assigneeUserId: number, conflict: { appointmentId: string; protocol: string }): ConflictError {
    return new ConflictError("O funcionário já tem outro agendamento neste horário", "ASSIGNEE_BUSY", {
        assigneeUserId: String(assigneeUserId),
        conflictingAppointmentId: conflict.appointmentId,
        conflictingProtocol: conflict.protocol,
    })
}

async function ensureActorCanTake(
    client: PoolClient,
    actor: RuleAccount | null,
    appointment: LockedAppointment,
    checkSchedule: boolean,
): Promise<void> {
    if (!actor || !isValidResponsible(actor)) {
        throw invalidAssigneeError()
    }
    if (!checkSchedule) {
        return
    }
    const appointmentDatetime = new Date(appointment.appointment_datetime)
    const slotMinutes = await readSlotMinutes(client, appointmentDatetime)
    const conflict = findResponsibleConflict({
        candidate: actor,
        appointmentId: String(appointment.id),
        appointmentDatetime,
        slotMinutes,
        busy: await readConfirmedAround(client, [actor.id], appointmentDatetime, slotMinutes),
    })
    if (conflict?.reason === "BUSY") {
        throw assigneeBusyError(actor.id, conflict)
    }
}

export function createAppointmentRepository(pool: Pool = getPool()): AppointmentRepository {
    async function getCurrentDocumentsConfig(
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
    }

    return {
        async countPending(): Promise<number> {
            const result = await pool.query<{ count: string }>(
                `SELECT COUNT(*)::text as count FROM Appointments WHERE status = 'PENDING'`,
            )
            return Number(result.rows[0]?.count ?? 0)
        },

        getCurrentDocumentsConfig,

        async findWeek(
            from: Date,
            to: Date,
            filters: CalendarFilters,
            now: Date = new Date(),
        ): Promise<WeekAppointmentRecord[]> {
            const params: unknown[] = [from, to]
            const conditions = ["a.appointment_datetime >= $1", "a.appointment_datetime < $2"]
            const status = statusCondition(filters.status, now, params)
            if (status) {
                conditions.push(status)
            }
            const responsible = responsibleCondition(filters, params)
            if (responsible) {
                conditions.push(responsible)
            }
            const result = await pool.query<{
                id: string
                protocol: string
                short_name: string
                appointment_datetime: Date
                status: AppointmentStatus
                assigned_user_id: string | null
                off_grid: boolean
            }>(
                `SELECT a.id, ${PROTOCOL_SQL} AS protocol, split_part(btrim(a.name), ' ', 1) AS short_name,
                        a.appointment_datetime, a.status, a.assigned_user_id, a.off_grid
                 FROM Appointments a
                 WHERE ${conditions.join(" AND ")}
                 ORDER BY a.appointment_datetime ASC, a.id ASC`,
                params,
            )
            return result.rows.map((row) => ({
                id: String(row.id),
                protocol: row.protocol,
                shortName: row.short_name,
                appointmentDatetime: new Date(row.appointment_datetime),
                status: row.status,
                assigned_user_id: row.assigned_user_id === null ? null : String(row.assigned_user_id),
                off_grid: row.off_grid,
            }))
        },

        async findStaff(): Promise<StaffMember[]> {
            const result = await pool.query<{ id: string; name: string; active: boolean }>(
                `SELECT u.id, u.name, u.active
                 FROM Users u
                 WHERE u.is_admin
                    OR EXISTS (
                        SELECT 1 FROM UserPermissions up
                        WHERE up.user_id = u.id AND up.permission_key = 'appointments.manage'
                    )
                 ORDER BY u.name ASC, u.id ASC`,
            )
            return result.rows.map((row) => ({ id: String(row.id), name: row.name, active: row.active }))
        },

        async findById(idOrCode: number | string): Promise<AppointmentDetailRecord | null> {
            const idStr = String(idOrCode).trim()
            if (!isValidAppointmentId(idStr)) {
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

            const currentDocs = await getCurrentDocumentsConfig(
                row.by_representative,
                Number(row.question_id),
            )

            const docsSent = row.documents_sent as {
                group?: string[]
                question?: string[]
            }
            const groupSent = docsSent.group || []
            const questionSent = docsSent.question || []
            const isDifferent = isDocumentsConfigDifferent(docsSent, currentDocs)

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

            const notesResult = await pool.query<{
                id: string
                author_user_id: string
                author_user_name: string | null
                text: string
                created_at: Date
            }>(
                `SELECT n.id, n.author_user_id, u.name AS author_user_name, n.text, n.created_at
                 FROM AppointmentNotes n
                 LEFT JOIN Users u ON u.id = n.author_user_id
                 WHERE n.appointment_id = $1
                 ORDER BY n.created_at ASC, n.id ASC`,
                [row.id],
            )

            const notes: AppointmentNote[] = notesResult.rows.map((note) => ({
                id: String(note.id),
                author_user_id: String(note.author_user_id),
                author_user_name: note.author_user_name,
                text: note.text,
                created_at: new Date(note.created_at).toISOString(),
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
                notes,
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
            const chipParams: unknown[] = []
            const chipResponsible = responsibleCondition(filters, chipParams)
            const chipPeriod = periodCondition(filters.period, now, chipParams) ?? "TRUE"
            chipParams.push(now)
            const waitingRecordParam = `$${chipParams.length}`
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
                     COUNT(*) FILTER (WHERE ${chipPeriod})::text as all,
                     COUNT(*) FILTER (WHERE ${chipPeriod} AND a.status = 'PENDING')::text as pending,
                     COUNT(*) FILTER (WHERE ${chipPeriod} AND a.status = 'CONFIRMED')::text as confirmed,
                     COUNT(*) FILTER (WHERE ${chipPeriod} AND a.status = 'ATTENDED')::text as attended,
                     COUNT(*) FILTER (WHERE ${chipPeriod} AND a.status = 'NO_SHOW')::text as no_show,
                     COUNT(*) FILTER (WHERE ${chipPeriod} AND a.status = 'CANCELED')::text as canceled,
                     COUNT(*) FILTER (WHERE a.status = 'CONFIRMED' AND a.appointment_datetime < ${waitingRecordParam})::text as waiting_record
                 FROM Appointments a
                 ${chipResponsible ? `WHERE ${chipResponsible}` : ""}`,
                chipParams,
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
                const status = statusCondition(filters.status, now, params)
                if (status) {
                    conditions.push(status)
                }

                const period = periodCondition(filters.period, now, params)
                if (period) {
                    conditions.push(period)
                }

                const responsible = responsibleCondition(filters, params)
                if (responsible) {
                    conditions.push(responsible)
                }
                paramIndex = params.length + 1
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

                const actor = (await lockAccounts(client, [actorUserId]))[0] ?? null
                const current = await lockAndDecide(client, "claim", id, now)
                await ensureActorCanTake(client, actor, current, true)

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

        assign(id: string, assigneeUserId: number, actorUserId: number, now: Date = new Date()): Promise<void> {
            return inTransaction(pool, async (client) => {
                const locked = await lockAccounts(client, [actorUserId, assigneeUserId])
                const target = locked.find((account) => account.id === assigneeUserId) ?? null
                const current = await lockAndDecide(client, "assign", id, now)
                if (current.assigned_user_id !== null && Number(current.assigned_user_id) === assigneeUserId) {
                    throw new ConflictError("O agendamento já está com este funcionário", "ALREADY_ASSIGNED_TO_USER")
                }
                const invalid = invalidAssigneeError()
                if (!target) {
                    throw invalid
                }
                const appointmentDatetime = new Date(current.appointment_datetime)
                const slotMinutes = await readSlotMinutes(client, appointmentDatetime)
                const conflict = findResponsibleConflict({
                    candidate: target,
                    appointmentId: String(current.id),
                    appointmentDatetime,
                    slotMinutes,
                    busy: await readConfirmedAround(client, [assigneeUserId], appointmentDatetime, slotMinutes),
                })
                if (conflict?.reason === "UNAVAILABLE") {
                    throw invalid
                }
                if (conflict?.reason === "BUSY") {
                    throw assigneeBusyError(assigneeUserId, conflict)
                }
                await assignAppointment(client, {
                    appointmentId: String(current.id),
                    assigneeUserId,
                    actorUserId,
                    data: { assignee_user_id: assigneeUserId },
                    now,
                })
            })
        },

        correctRecord(id: string, actorUserId: number, now: Date = new Date()): Promise<CorrectionResult> {
            return inTransaction(pool, async (client) => {
                const before = await client.query<{ assigned_user_id: string | null }>(
                    "SELECT assigned_user_id FROM Appointments WHERE id = $1",
                    [id],
                )
                const expectedResponsible = before.rows[0]?.assigned_user_id ?? null
                const responsibleId = expectedResponsible === null ? null : Number(expectedResponsible)
                const locked = await lockAccounts(client, responsibleId === null ? [actorUserId] : [actorUserId, responsibleId])
                const responsible = locked.find((account) => account.id === responsibleId) ?? null
                const current = await lockAndDecide(client, "correct_record", id, now)
                if (current.assigned_user_id !== expectedResponsible) {
                    throw new ConflictError(
                        "O agendamento mudou enquanto a correção era feita",
                        "RECORD_NOT_CORRECTABLE",
                    )
                }
                const appointmentId = String(current.id)
                const appointmentDatetime = new Date(current.appointment_datetime)
                const previousResponsible = current.assigned_user_id === null ? null : Number(current.assigned_user_id)
                let target = restoredStateAfterCorrection(await readCorrectionHistory(client, appointmentId), {
                    assignedUserId: previousResponsible,
                })
                let warning: CorrectionWarning | null = null

                if (target.status === "CONFIRMED" && !isDatetimePast(appointmentDatetime, now)) {
                    const slotMinutes = await readSlotMinutes(client, appointmentDatetime)
                    const conflict: ResponsibleConflict | null = responsible
                        ? findResponsibleConflict({
                              candidate: responsible,
                              appointmentId,
                              appointmentDatetime,
                              slotMinutes,
                              busy: await readConfirmedAround(client, [target.assignedUserId], appointmentDatetime, slotMinutes),
                          })
                        : { reason: "UNAVAILABLE" }
                    if (conflict) {
                        warning = await correctionWarning(
                            client,
                            appointmentId,
                            target.assignedUserId,
                            appointmentDatetime,
                            slotMinutes,
                            conflict,
                        )
                        target = { status: "PENDING", assignedUserId: null }
                    }
                }

                await client.query("UPDATE Appointments SET status = $2, assigned_user_id = $3 WHERE id = $1", [
                    appointmentId,
                    target.status,
                    target.assignedUserId,
                ])
                await client.query(
                    `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                     VALUES ($1, 'RECORD_CORRECTED', $2, $3::jsonb, $4)`,
                    [
                        appointmentId,
                        actorUserId,
                        JSON.stringify({ previous_status: current.status, previous_assigned_user_id: previousResponsible }),
                        now,
                    ],
                )
                return { warning }
            })
        },

        addNote(id: string, authorUserId: number, text: string, now: Date = new Date()): Promise<void> {
            return inTransaction(pool, async (client) => {
                await lockAccounts(client, [authorUserId])
                const result = await client.query(
                    `INSERT INTO AppointmentNotes (appointment_id, author_user_id, text, created_at)
                     SELECT a.id, $2, $3, $4 FROM Appointments a WHERE a.id = $1`,
                    [id, authorUserId, text, now],
                )
                if (result.rowCount === 0) {
                    throw new NotFoundError("Agendamento não encontrado")
                }
            })
        },

        cancel(
            id: string,
            actorUserId: number,
            reason: CancellationReason,
            note: string | undefined,
            now: Date = new Date(),
        ): Promise<void> {
            return inTransaction(pool, async (client) => {
                await lockAccounts(client, [actorUserId])
                await lockAndDecide(client, "cancel", id, now)
                await client.query("UPDATE Appointments SET status = 'CANCELED' WHERE id = $1", [id])
                await client.query(
                    `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                     VALUES ($1, 'CANCELED_BY_STAFF', $2, $3::jsonb, $4)`,
                    [id, actorUserId, JSON.stringify({ reason }), now],
                )
                if (note !== undefined) {
                    await client.query(
                        `INSERT INTO AppointmentNotes (appointment_id, author_user_id, text, created_at)
                         VALUES ($1, $2, $3, $4)`,
                        [id, actorUserId, note, now],
                    )
                }
            })
        },

        async findCancellationNoticeTarget(id: string): Promise<CancellationNoticeTarget | null> {
            if (!isValidAppointmentId(id)) {
                return null
            }
            const result = await pool.query<{
                status: AppointmentStatus
                appointment_datetime: Date
                name: string
                protocol: string
                phone_encrypted: string | null
                last_staff_cancel_reason: CancellationReason | null
                last_notice_type: "CITIZEN_NOTIFIED" | "CITIZEN_NOTIFICATION_FAILED" | null
            }>(
                `SELECT a.status, a.appointment_datetime, a.name, ${PROTOCOL_SQL} AS protocol, a.phone_encrypted,
                        (SELECT e.data->>'reason' FROM AppointmentEvents e
                         WHERE e.appointment_id = a.id AND e.type = 'CANCELED_BY_STAFF'
                         ORDER BY e.created_at DESC, e.id DESC LIMIT 1) AS last_staff_cancel_reason,
                        (SELECT e.type::text FROM AppointmentEvents e
                         WHERE e.appointment_id = a.id
                           AND e.type IN ('CITIZEN_NOTIFIED', 'CITIZEN_NOTIFICATION_FAILED')
                           AND e.data->>'kind' = 'CANCELLATION'
                         ORDER BY e.created_at DESC, e.id DESC LIMIT 1) AS last_notice_type
                 FROM Appointments a
                 WHERE a.id = $1`,
                [id],
            )
            const row = result.rows[0]
            if (!row) {
                return null
            }
            return {
                status: row.status,
                appointmentDatetime: new Date(row.appointment_datetime),
                name: row.name,
                protocol: row.protocol,
                phoneEncrypted: row.phone_encrypted,
                lastStaffCancelReason: row.last_staff_cancel_reason,
                lastCancellationNotice:
                    row.last_notice_type === null ? null : row.last_notice_type === "CITIZEN_NOTIFIED" ? "NOTIFIED" : "FAILED",
            }
        },

        async recordCitizenNotification(
            id: string,
            outcome: CitizenNotificationOutcome,
            kind: CitizenNotificationKind,
            actorUserId: number,
            now: Date = new Date(),
            providerMessageId: string | null = null,
        ): Promise<void> {
            await inTransaction(pool, async (client) => {
                await client.query(
                    `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                     VALUES ($1, $2::appointment_event_type, $3, $4::jsonb, $5)`,
                    [id, outcome === "NOTIFIED" ? "CITIZEN_NOTIFIED" : "CITIZEN_NOTIFICATION_FAILED", actorUserId, JSON.stringify({ kind }), now],
                )
                if (outcome === "FAILED") {
                    await client.query(
                        `INSERT INTO OutboundMessages (kind, appointment_id, status, status_at)
                         VALUES ($1::outbound_kind, $2, 'FAILED', $3)`,
                        [kind, id, now],
                    )
                    return
                }
                if (providerMessageId === null) {
                    return
                }
                const sent = await client.query<{ status: string }>(
                    `INSERT INTO OutboundMessages (provider_message_id, kind, appointment_id, status, status_at)
                     VALUES ($1, $2::outbound_kind, $3, 'SENT', $4)
                     ON CONFLICT (provider_message_id) DO UPDATE
                     SET kind = EXCLUDED.kind, appointment_id = EXCLUDED.appointment_id
                     RETURNING status`,
                    [providerMessageId, kind, id, now],
                )
                if (sent.rows[0]?.status === "FAILED") {
                    await client.query(
                        `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                         VALUES ($1, 'CITIZEN_NOTIFICATION_FAILED', NULL, $2::jsonb, $3)`,
                        [id, JSON.stringify({ kind }), new Date(now.getTime() + 1)],
                    )
                }
            })
        },

        async countNotifiedPhonesBetween(from: Date, to: Date): Promise<number> {
            const result = await pool.query<{ count: number }>(
                `SELECT COUNT(DISTINCT s.phone_hash)::int AS count
                 FROM AppointmentEvents e
                 JOIN Appointments a ON a.id = e.appointment_id
                 JOIN Sessions s ON s.id = a.session_id
                 WHERE e.type = 'CITIZEN_NOTIFIED'
                   AND e.data->>'kind' IN ('CANCELLATION', 'REMINDER')
                   AND e.created_at >= $1
                   AND e.created_at <= $2`,
                [from, to],
            )
            return result.rows[0]?.count ?? 0
        },

        async markAttended(
            id: string,
            actorUserId: number,
            now: Date = new Date(),
        ): Promise<void> {
            const client = await pool.connect()
            try {
                await client.query("BEGIN")

                const actor = (await lockAccounts(client, [actorUserId]))[0] ?? null
                const current = await lockAndDecide(client, "attended", id, now)

                const isAutoClaim = current.status === "PENDING"
                if (isAutoClaim) {
                    await ensureActorCanTake(
                        client,
                        actor,
                        current,
                        !isDatetimePast(new Date(current.appointment_datetime), now),
                    )

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

                const actor = (await lockAccounts(client, [actorUserId]))[0] ?? null
                const current = await lockAndDecide(client, "no_show", id, now)

                const isAutoClaim = current.status === "PENDING"
                if (isAutoClaim) {
                    await ensureActorCanTake(
                        client,
                        actor,
                        current,
                        !isDatetimePast(new Date(current.appointment_datetime), now),
                    )

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
