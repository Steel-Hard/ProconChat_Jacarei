import type { PoolClient } from "pg"
import getPool from "../../../db/connection"

export const TEST_CATEGORY_TITLE = "Categoria Agenda Teste"

type Row = Record<string, unknown>

export interface ScheduleConfigSnapshot {
    settings: Row[]
    ranges: Row[]
    blockedDates: Row[]
    scheduleChanges: Row[]
}

export interface ScheduleSettingsInput {
    slot_minutes: number
    seats_per_slot: number
    window_days: number
    min_notice_days: number
    wait_alert_days: number
    unit_address: string
    unit_address_complement: string | null
    reminder_enabled: boolean
    reminder_hours: number
}

export interface ScheduleRangeInput {
    weekday: number
    slot_index: number
    start_time: string
    end_time: string
}

export interface BlockedDateInput {
    date: string
    start_time: string | null
    end_time: string | null
    description: string
}

export interface ScheduleConfigInput {
    settings: ScheduleSettingsInput
    ranges: ScheduleRangeInput[]
    blockedDates?: BlockedDateInput[]
}

export type CountableTable =
    | "Appointments"
    | "AppointmentEvents"
    | "ConversationEvents"
    | "Sessions"
    | "ScheduleSettings"
    | "ScheduleRanges"
    | "BlockedDates"
    | "ScheduleChanges"

export async function snapshotScheduleConfig(): Promise<ScheduleConfigSnapshot> {
    const pool = getPool()
    const settings = await pool.query<Row>(
        `SELECT id, slot_minutes, seats_per_slot, window_days, min_notice_days, wait_alert_days,
                unit_address, unit_address_complement, reminder_enabled, reminder_hours,
                updated_by, updated_at::text AS updated_at
         FROM ScheduleSettings
         ORDER BY id`,
    )
    const ranges = await pool.query<Row>(
        `SELECT id, weekday, slot_index, start_time::text AS start_time, end_time::text AS end_time
         FROM ScheduleRanges
         ORDER BY id`,
    )
    const blockedDates = await pool.query<Row>(
        `SELECT id, date::text AS date, start_time::text AS start_time, end_time::text AS end_time, description
         FROM BlockedDates
         ORDER BY id`,
    )

    const scheduleChanges = await pool.query<Row>(
        `SELECT effective_from::text AS effective_from, config::text AS config, updated_by,
                updated_at::text AS updated_at
         FROM ScheduleChanges
         ORDER BY effective_from`,
    )

    return {
        settings: settings.rows,
        ranges: ranges.rows,
        blockedDates: blockedDates.rows,
        scheduleChanges: scheduleChanges.rows,
    }
}

async function insertRows(client: PoolClient, table: string, rows: Row[]): Promise<void> {
    for (const row of rows) {
        const columns = Object.keys(row)
        const placeholders = columns.map((_, index) => `$${index + 1}`)
        await client.query(
            `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
            columns.map((column) => row[column]),
        )
    }
}

async function inTransaction(callback: (client: PoolClient) => Promise<void>): Promise<void> {
    const client = await getPool().connect()
    try {
        await client.query("BEGIN")
        await callback(client)
        await client.query("COMMIT")
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
    }
}

export async function restoreScheduleConfig(snapshot: ScheduleConfigSnapshot): Promise<void> {
    await inTransaction(async (client) => {
        await client.query("DELETE FROM ScheduleChanges")
        await client.query("DELETE FROM BlockedDates")
        await client.query("DELETE FROM ScheduleRanges")
        await client.query("DELETE FROM ScheduleSettings")
        await insertRows(client, "ScheduleSettings", snapshot.settings)
        await insertRows(client, "ScheduleRanges", snapshot.ranges)
        await insertRows(client, "BlockedDates", snapshot.blockedDates)
        await insertRows(client, "ScheduleChanges", snapshot.scheduleChanges)
    })
}

export async function useScheduleConfig({ settings, ranges, blockedDates = [] }: ScheduleConfigInput): Promise<void> {
    await inTransaction(async (client) => {
        await client.query("DELETE FROM ScheduleChanges")
        await client.query("DELETE FROM BlockedDates")
        await client.query("DELETE FROM ScheduleRanges")
        await client.query("DELETE FROM ScheduleSettings")
        await insertRows(client, "ScheduleSettings", [{ id: 1, ...settings }])
        await insertRows(client, "ScheduleRanges", ranges.map((range) => ({ ...range })))
        await insertRows(client, "BlockedDates", blockedDates.map((blocked) => ({ ...blocked })))
    })
}

export async function insertScheduleChange(
    effectiveFrom: string,
    config: object,
    updatedBy: number | string,
): Promise<void> {
    await getPool().query(
        `INSERT INTO ScheduleChanges (effective_from, config, updated_by)
         VALUES ($1, $2::jsonb, $3)`,
        [effectiveFrom, JSON.stringify(config), updatedBy],
    )
}

export async function createTestQuestion(): Promise<{ categoryId: number; questionId: number }> {
    const pool = getPool()
    const category = await pool.query<{ id: number }>(
        "INSERT INTO Categories (title, short_title) VALUES ($1, 'Agenda') RETURNING id",
        [TEST_CATEGORY_TITLE],
    )
    const categoryId = category.rows[0]!.id

    const question = await pool.query<{ id: number }>(
        `INSERT INTO Questions (category_id, question, answer, short_title, out_of_scope, requires_in_person, llm_allowed)
         VALUES ($1, 'Pergunta Agenda Teste', 'Compareça ao Procon.', 'Agenda', false, true, false)
         RETURNING id`,
        [categoryId],
    )

    return { categoryId, questionId: question.rows[0]!.id }
}

export interface ScheduleTestDataScope {
    phoneHashes: string[]
    appointmentIds: string[]
}

export async function cleanupScheduleTestData({ phoneHashes, appointmentIds }: ScheduleTestDataScope): Promise<void> {
    const pool = getPool()

    const categories = await pool.query<{ id: string }>("SELECT id FROM Categories WHERE title = $1", [
        TEST_CATEGORY_TITLE,
    ])
    const categoryIds = categories.rows.map((row) => row.id)

    const questions = await pool.query<{ id: string }>(
        "SELECT id FROM Questions WHERE category_id = ANY($1::bigint[])",
        [categoryIds],
    )
    const questionIds = questions.rows.map((row) => row.id)

    const sessions = await pool.query<{ id: string }>(
        "SELECT id FROM Sessions WHERE phone_hash = ANY($1::text[])",
        [phoneHashes],
    )
    const sessionIds = sessions.rows.map((row) => row.id)

    const appointments = await pool.query<{ id: string }>(
        `SELECT id FROM Appointments
         WHERE session_id = ANY($1::bigint[]) OR id = ANY($2::bigint[]) OR question_id = ANY($3::bigint[])`,
        [sessionIds, appointmentIds, questionIds],
    )
    const allAppointmentIds = appointments.rows.map((row) => row.id)

    if (allAppointmentIds.length > 0) {
        await pool.query("DELETE FROM ConversationEvents WHERE appointment_id = ANY($1::bigint[])", [
            allAppointmentIds,
        ])
        await pool.query("DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])", [
            allAppointmentIds,
        ])
        await pool.query("DELETE FROM Appointments WHERE id = ANY($1::bigint[])", [allAppointmentIds])
    }

    if (sessionIds.length > 0) {
        await pool.query("DELETE FROM ConversationEvents WHERE session_id = ANY($1::bigint[])", [sessionIds])
        await pool.query("DELETE FROM Sessions WHERE id = ANY($1::bigint[])", [sessionIds])
    }

    if (categoryIds.length > 0) {
        await pool.query(
            "DELETE FROM ConversationEvents WHERE question_id = ANY($1::bigint[]) OR category_id = ANY($2::bigint[])",
            [questionIds, categoryIds],
        )
        await pool.query("DELETE FROM RequiredDocuments WHERE question_id = ANY($1::bigint[])", [questionIds])
        await pool.query("DELETE FROM Questions WHERE id = ANY($1::bigint[])", [questionIds])
        await pool.query("DELETE FROM Categories WHERE id = ANY($1::bigint[])", [categoryIds])
    }
}

export async function countRows(table: CountableTable, where = "TRUE", params: unknown[] = []): Promise<number> {
    const result = await getPool().query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM ${table} WHERE ${where}`,
        params,
    )
    return result.rows[0]?.count ?? 0
}
