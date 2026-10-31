import type { PoolClient } from "pg"
import getPool from "../db/connection"
import BookingFailedError from "../errors/BookingFailedError"
import BadRequestError from "../errors/BadRequestError"
import ConflictError from "../errors/ConflictError"
import DuplicateAppointmentError from "../errors/DuplicateAppointmentError"
import NotFoundError from "../errors/NotFoundError"
import ScheduleNotConfiguredError from "../errors/ScheduleNotConfiguredError"
import SlotFullError from "../errors/SlotFullError"
import {
    appointmentsInScheduleInterval,
    detectScheduleConflicts,
    freeSlotStartsOfDay,
    scheduleBlockedDatesOf,
    scheduleRangesOf,
    toMinutes,
    trimTime,
} from "../services/scheduleRules"
import {
    BlockedDate,
    BookAppointmentInput,
    BookAppointmentResult,
    DocumentsSent,
    FutureActiveAppointment,
    MinNoticeDays,
    NormalizedScheduleConfig,
    ReminderHours,
    ScheduleConfigView,
    ScheduleRange,
    ScheduleSettings,
    ScheduleVersion,
    SlotMinutes,
} from "../types/schedule.types"
import { encrypt } from "../utils/crypto.utils"
import { addDaysToDateString, getLocalParts } from "../utils/date.utils"
import { insertConversationEvent, Queryable } from "./conversationEvent.repository"
import { lockAccounts } from "./responsibleQueries"
import { finishSessionWith } from "./session.repository"
import {
    IScheduleRepository,
    SaveScheduleConfigRepoParams,
} from "./schedule.repository.interface"

interface SettingsWithAuthorRow {
    id: number
    slot_minutes: number
    seats_per_slot: number
    window_days: number
    min_notice_days: number
    wait_alert_days: number
    unit_address: string
    unit_address_complement: string | null
    reminder_enabled: boolean
    reminder_hours: number
    updated_by: string | number | null
    updated_by_name: string | null
    updated_at: Date | null
}

async function selectSettings(db: Queryable): Promise<ScheduleSettings | null> {
    const result = await db.query<ScheduleSettings>(
        `SELECT id, slot_minutes, seats_per_slot, window_days, min_notice_days,
                wait_alert_days, unit_address, unit_address_complement,
                reminder_enabled, reminder_hours
         FROM ScheduleSettings
         WHERE id = 1`,
    )
    return result.rows[0] ?? null
}

async function getSettings(): Promise<ScheduleSettings | null> {
    return selectSettings(getPool())
}

async function selectRanges(db: Queryable): Promise<ScheduleRange[]> {
    const result = await db.query<ScheduleRange>(
        `SELECT id, weekday, slot_index, start_time::text, end_time::text
         FROM ScheduleRanges
         ORDER BY weekday, slot_index`,
    )
    return result.rows
}

async function getRanges(): Promise<ScheduleRange[]> {
    return selectRanges(getPool())
}

async function selectBlockedDates(
    db: Queryable,
    fromDate: string,
    toDate: string,
): Promise<BlockedDate[]> {
    const result = await db.query<BlockedDate>(
        `SELECT id, date::text, start_time::text, end_time::text, description
         FROM BlockedDates
         WHERE date >= $1 AND date <= $2
         ORDER BY date, start_time NULLS FIRST, id`,
        [fromDate, toDate],
    )
    return result.rows
}

async function getBlockedDates(
    fromDate: string,
    toDate: string,
): Promise<BlockedDate[]> {
    return selectBlockedDates(getPool(), fromDate, toDate)
}

async function countActiveAppointmentsPerSlot(
    fromDatetime: Date,
    toDatetime: Date,
): Promise<Map<string, number>> {
    const pool = getPool()
    const result = await pool.query<{
        appointment_datetime: Date
        count: string
    }>(
        `SELECT appointment_datetime, COUNT(*)::text as count
         FROM Appointments
         WHERE status IN ('PENDING', 'CONFIRMED')
           AND appointment_datetime >= $1
           AND appointment_datetime <= $2
         GROUP BY appointment_datetime`,
        [fromDatetime, toDatetime],
    )

    const map = new Map<string, number>()
    for (const row of result.rows) {
        map.set(
            new Date(row.appointment_datetime).toISOString(),
            Number(row.count),
        )
    }
    return map
}

async function selectConfigView(db: Queryable): Promise<ScheduleConfigView | null> {
    const settingsResult = await db.query<SettingsWithAuthorRow>(
        `SELECT s.id,
                s.slot_minutes,
                s.seats_per_slot,
                s.window_days,
                s.min_notice_days,
                s.wait_alert_days,
                s.unit_address,
                s.unit_address_complement,
                s.reminder_enabled,
                s.reminder_hours,
                s.updated_by,
                u.name AS updated_by_name,
                s.updated_at
         FROM ScheduleSettings s
         LEFT JOIN Users u ON u.id = s.updated_by
         WHERE s.id = 1`,
    )
    const s = settingsResult.rows[0]
    if (!s) {
        return null
    }

    const rangesResult = await db.query<{
        weekday: number
        slot_index: number
        start_time: string
        end_time: string
    }>(
        `SELECT weekday, slot_index, start_time::text, end_time::text
         FROM ScheduleRanges
         ORDER BY weekday ASC, slot_index ASC`,
    )

    const blocksResult = await db.query<{
        date: string
        start_time: string | null
        end_time: string | null
        description: string
    }>(
        `SELECT date::text, start_time::text, end_time::text, description
         FROM BlockedDates
         ORDER BY date ASC, start_time ASC NULLS FIRST, id ASC`,
    )

    return {
        slotMinutes: s.slot_minutes as SlotMinutes,
        seatsPerSlot: s.seats_per_slot,
        windowDays: s.window_days,
        minNoticeDays: s.min_notice_days as MinNoticeDays,
        waitAlertDays: s.wait_alert_days,
        unitAddress: s.unit_address,
        unitAddressComplement: s.unit_address_complement,
        reminderEnabled: s.reminder_enabled,
        reminderHours: s.reminder_hours as ReminderHours,
        ranges: rangesResult.rows.map((r) => ({
            weekday: r.weekday,
            slotIndex: r.slot_index,
            startTime: trimTime(r.start_time),
            endTime: trimTime(r.end_time),
        })),
        blockedDates: blocksResult.rows.map((b) => ({
            date: b.date,
            startTime: b.start_time ? trimTime(b.start_time) : null,
            endTime: b.end_time ? trimTime(b.end_time) : null,
            description: b.description,
        })),
        updatedBy:
            s.updated_by !== null && s.updated_by_name !== null
                ? { id: Number(s.updated_by), name: s.updated_by_name }
                : null,
        updatedAt: s.updated_at ? new Date(s.updated_at).toISOString() : null,
    }
}

async function getConfig(): Promise<ScheduleConfigView | null> {
    const today = getLocalParts(new Date()).dateStr
    const versions = await selectScheduledVersions(getPool(), today, today)
    return versions.at(-1)?.config ?? null
}

function versionFromRow(row: {
    effective_from: string
    config: NormalizedScheduleConfig
    updated_by: number
    updated_by_name: string | null
    updated_at: Date
}): ScheduleVersion {
    return {
        effectiveFrom: row.effective_from,
        config: {
            ...row.config,
            effectiveFrom: row.effective_from,
            updatedBy: row.updated_by_name
                ? { id: Number(row.updated_by), name: row.updated_by_name }
                : null,
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        },
    }
}

const OPEN_END_DATE = "9999-12-31"

async function validateAgainstAllVersions(
    client: PoolClient,
    today: string,
    validate: SaveScheduleConfigRepoParams["validateAgainstVersions"],
): Promise<void> {
    if (validate) {
        validate(await selectScheduledVersions(client, today, OPEN_END_DATE))
    }
}

async function selectScheduledVersions(
    db: Queryable,
    fromDate: string,
    toDate: string,
): Promise<ScheduleVersion[]> {
    const result = await db.query<{
        effective_from: string
        config: NormalizedScheduleConfig
        updated_by: number
        updated_by_name: string | null
        updated_at: Date
    }>(
        `WITH preceding AS (
             SELECT effective_from, config, updated_by, updated_at
             FROM ScheduleChanges
             WHERE effective_from <= $1
             ORDER BY effective_from DESC
             LIMIT 1
         ), relevant AS (
             SELECT effective_from, config, updated_by, updated_at FROM preceding
             UNION ALL
             SELECT effective_from, config, updated_by, updated_at
             FROM ScheduleChanges
             WHERE effective_from > $1 AND effective_from <= $2
         )
         SELECT to_char(r.effective_from, 'YYYY-MM-DD') AS effective_from,
                r.config,
                r.updated_by,
                u.name AS updated_by_name,
                r.updated_at
         FROM relevant r
         LEFT JOIN Users u ON u.id = r.updated_by
         ORDER BY r.effective_from`,
        [fromDate, toDate],
    )
    const versions = result.rows.map(versionFromRow)
    if (versions.length === 0 || versions[0]?.effectiveFrom !== null) {
        const base = await selectConfigView(db)
        if (base) {
            versions.unshift({ effectiveFrom: null, config: { ...base, effectiveFrom: null } })
        }
    }
    return versions
}

async function getConfigForDate(date: string): Promise<ScheduleVersion | null> {
    const versions = await selectScheduledVersions(getPool(), date, date)
    return versions.at(-1) ?? null
}

async function getScheduleVersions(fromDate: string, toDate: string): Promise<ScheduleVersion[]> {
    return selectScheduledVersions(getPool(), fromDate, toDate)
}

async function listScheduledConfigs(fromDate: string): Promise<ScheduleVersion[]> {
    const pool = getPool()
    const result = await pool.query<{
        effective_from: string
        config: NormalizedScheduleConfig
        updated_by: number
        updated_by_name: string | null
        updated_at: Date
    }>(
        `SELECT to_char(s.effective_from, 'YYYY-MM-DD') AS effective_from,
                s.config,
                s.updated_by,
                u.name AS updated_by_name,
                s.updated_at
         FROM ScheduleChanges s
         LEFT JOIN Users u ON u.id = s.updated_by
         WHERE s.effective_from > $1
         ORDER BY s.effective_from`,
        [fromDate],
    )
    return result.rows.map(versionFromRow)
}

async function nextScheduleChangeDate(db: Queryable, effectiveFrom: string): Promise<string | null> {
    const result = await db.query<{ effective_from: string }>(
        `SELECT to_char(effective_from, 'YYYY-MM-DD') AS effective_from
         FROM ScheduleChanges
         WHERE effective_from > $1
         ORDER BY effective_from
         LIMIT 1`,
        [effectiveFrom],
    )
    return result.rows[0]?.effective_from ?? null
}

async function saveScheduledConfig({
    config,
    actorUserId,
    now,
    effectiveFrom,
    validateAgainstVersions,
}: SaveScheduleConfigRepoParams & { effectiveFrom: string }): Promise<ScheduleConfigView> {
    const today = getLocalParts(now).dateStr
    if (effectiveFrom <= today) {
        throw new BadRequestError("A data de início da mudança deve ser futura")
    }

    const pool = getPool()
    const client = await pool.connect()
    try {
        await client.query("BEGIN")
        await client.query("SELECT pg_advisory_xact_lock(hashtext('schedule_config'))")
        await lockAccounts(client, [actorUserId])
        await validateAgainstAllVersions(client, today, validateAgainstVersions)

        const nextDate = await nextScheduleChangeDate(client, effectiveFrom)
        const previousDate = addDaysToDateString(effectiveFrom, -1)
        const previousVersions = await selectScheduledVersions(client, previousDate, previousDate)
        const previous = previousVersions.at(-1)
        if (!previous) {
            throw new ScheduleNotConfiguredError()
        }

        const appointments = appointmentsInScheduleInterval(
            await loadFutureActiveAppointments(client, now),
            effectiveFrom,
            nextDate,
        )
        const conflicts = detectScheduleConflicts(config, appointments, previous.config.slotMinutes)
        if (conflicts.length > 0) {
            throw new ConflictError(
                "Esta alteração afeta agendamentos futuros",
                "SCHEDULE_CONFLICTS",
                { conflicts },
            )
        }

        await client.query(
            `INSERT INTO ScheduleChanges (effective_from, config, updated_by, updated_at)
             VALUES ($1, $2::jsonb, $3, NOW())
             ON CONFLICT (effective_from) DO UPDATE SET
                config = EXCLUDED.config,
                updated_by = EXCLUDED.updated_by,
                updated_at = NOW()`,
            [effectiveFrom, JSON.stringify(config), actorUserId],
        )

        const versions = await selectScheduledVersions(client, effectiveFrom, effectiveFrom)
        const saved = versions.at(-1)?.config
        if (!saved) {
            throw new ScheduleNotConfiguredError()
        }
        await client.query("COMMIT")
        return saved
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
    }
}

async function deleteScheduledConfig(effectiveFrom: string, now: Date): Promise<void> {
    const today = getLocalParts(now).dateStr
    if (effectiveFrom <= today) {
        throw new BadRequestError("Não é possível cancelar uma mudança que já começou")
    }

    const pool = getPool()
    const client = await pool.connect()
    try {
        await client.query("BEGIN")
        await client.query("SELECT pg_advisory_xact_lock(hashtext('schedule_config'))")
        const existing = await client.query(
            "SELECT 1 FROM ScheduleChanges WHERE effective_from = $1 FOR UPDATE",
            [effectiveFrom],
        )
        if ((existing.rowCount ?? 0) === 0) {
            throw new NotFoundError("Mudança de horário não encontrada")
        }

        const nextDate = await nextScheduleChangeDate(client, effectiveFrom)
        const previousDate = addDaysToDateString(effectiveFrom, -1)
        const previousVersions = await selectScheduledVersions(client, previousDate, previousDate)
        const previous = previousVersions.at(-1)
        if (!previous) {
            throw new ScheduleNotConfiguredError()
        }

        const appointments = appointmentsInScheduleInterval(
            await loadFutureActiveAppointments(client, now),
            effectiveFrom,
            nextDate,
        )
        const conflicts = detectScheduleConflicts(
            previous.config as NormalizedScheduleConfig,
            appointments,
            previous.config.slotMinutes,
        )
        if (conflicts.length > 0) {
            throw new ConflictError(
                "O cancelamento afeta agendamentos futuros",
                "SCHEDULE_CONFLICTS",
                { conflicts },
            )
        }

        await client.query("DELETE FROM ScheduleChanges WHERE effective_from = $1", [effectiveFrom])
        await client.query("COMMIT")
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
    }
}

async function selectFutureActiveAppointments(
    db: Queryable,
    now: Date,
    lockRows: boolean,
): Promise<FutureActiveAppointment[]> {
    const result = await db.query<{
        id: string
        protocol: string
        name: string
        cpf_masked: string
        appointment_datetime: Date
        request_datetime: Date
        status: "PENDING" | "CONFIRMED"
        assigned_user_id: string | null
        off_grid: boolean
    }>(
        `SELECT a.id::text AS id,
                UPPER(SUBSTRING(a.appointment_code::text, 1, 8)) AS protocol,
                a.name,
                a.cpf_masked,
                a.appointment_datetime,
                a.request_datetime,
                a.status,
                a.assigned_user_id::text AS assigned_user_id,
                a.off_grid
         FROM Appointments a
         WHERE a.status IN ('PENDING', 'CONFIRMED')
           AND a.appointment_datetime > $1
         ORDER BY a.id${lockRows ? " FOR UPDATE" : ""}`,
        [now],
    )

    const sorted = [...result.rows].sort(
        (a, b) =>
            new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime() ||
            Number(a.id) - Number(b.id),
    )
    return sorted.map((r) => ({
        id: r.id,
        protocol: r.protocol,
        name: r.name,
        cpfMasked: r.cpf_masked,
        appointmentDatetime: new Date(r.appointment_datetime),
        requestDatetime: new Date(r.request_datetime),
        status: r.status,
        assignedUserId: r.assigned_user_id === null ? null : Number(r.assigned_user_id),
        offGrid: r.off_grid,
    }))
}

async function loadFutureActiveAppointments(
    client: PoolClient,
    now: Date,
): Promise<FutureActiveAppointment[]> {
    return selectFutureActiveAppointments(client, now, true)
}

async function listFutureActiveAppointments(now: Date): Promise<FutureActiveAppointment[]> {
    return selectFutureActiveAppointments(getPool(), now, false)
}

async function saveConfig({
    config,
    actorUserId,
    now,
    validateAgainstVersions,
}: SaveScheduleConfigRepoParams): Promise<ScheduleConfigView> {
    const pool = getPool()
    const client = await pool.connect()

    try {
        await client.query("BEGIN")
        await client.query("SELECT pg_advisory_xact_lock(hashtext('schedule_config'))")
        await lockAccounts(client, [actorUserId])
        const today = getLocalParts(now).dateStr
        await validateAgainstAllVersions(client, today, validateAgainstVersions)
        const currentVersions = await selectScheduledVersions(client, today, today)
        const currentVersion = currentVersions.at(-1)
        const current = await client.query<{ slot_minutes: number }>(
            "SELECT slot_minutes FROM ScheduleSettings WHERE id = 1 FOR UPDATE",
        )
        const currentSlotMinutes = currentVersion?.config.slotMinutes ?? current.rows[0]?.slot_minutes ?? null

        const nextDate = await nextScheduleChangeDate(client, today)
        const futureAppointments = appointmentsInScheduleInterval(
            await loadFutureActiveAppointments(client, now),
            today,
            nextDate,
        )
        const conflicts = detectScheduleConflicts(config, futureAppointments, currentSlotMinutes)
        if (conflicts.length > 0) {
            throw new ConflictError(
                "Esta alteração afeta agendamentos futuros",
                "SCHEDULE_CONFLICTS",
                { conflicts },
            )
        }

        if (currentVersion?.effectiveFrom) {
            await client.query(
                `INSERT INTO ScheduleChanges (effective_from, config, updated_by, updated_at)
                 VALUES ($1, $2::jsonb, $3, NOW())
                 ON CONFLICT (effective_from) DO UPDATE SET
                    config = EXCLUDED.config,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = NOW()`,
                [today, JSON.stringify(config), actorUserId],
            )
        } else {
            await client.query(
            `INSERT INTO ScheduleSettings (
                id, slot_minutes, seats_per_slot, window_days, min_notice_days,
                wait_alert_days, unit_address, unit_address_complement,
                reminder_enabled, reminder_hours, updated_by, updated_at
             ) VALUES (
                1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
             )
             ON CONFLICT (id) DO UPDATE SET
                slot_minutes = EXCLUDED.slot_minutes,
                seats_per_slot = EXCLUDED.seats_per_slot,
                window_days = EXCLUDED.window_days,
                min_notice_days = EXCLUDED.min_notice_days,
                wait_alert_days = EXCLUDED.wait_alert_days,
                unit_address = EXCLUDED.unit_address,
                unit_address_complement = EXCLUDED.unit_address_complement,
                reminder_enabled = EXCLUDED.reminder_enabled,
                reminder_hours = EXCLUDED.reminder_hours,
                updated_by = EXCLUDED.updated_by,
                updated_at = NOW()`,
            [
                config.slotMinutes,
                config.seatsPerSlot,
                config.windowDays,
                config.minNoticeDays,
                config.waitAlertDays,
                config.unitAddress,
                config.unitAddressComplement,
                config.reminderEnabled,
                config.reminderHours,
                actorUserId,
            ],
            )

            await client.query("DELETE FROM ScheduleRanges")
            for (const range of config.ranges) {
                await client.query(
                    `INSERT INTO ScheduleRanges (weekday, slot_index, start_time, end_time)
                     VALUES ($1, $2, $3, $4)`,
                    [range.weekday, range.slotIndex, range.startTime, range.endTime],
                )
            }

            await client.query("DELETE FROM BlockedDates")
            for (const block of config.blockedDates) {
                await client.query(
                    `INSERT INTO BlockedDates (date, start_time, end_time, description)
                     VALUES ($1, $2, $3, $4)`,
                    [block.date, block.startTime, block.endTime, block.description],
                )
            }
        }

        const updatedView = currentVersion?.effectiveFrom
            ? (await selectScheduledVersions(client, today, today)).at(-1)?.config ?? null
            : await selectConfigView(client)
        if (!updatedView) {
            throw new ScheduleNotConfiguredError()
        }

        await client.query("COMMIT")
        return updatedView
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}

async function lockScheduleConfigShared(client: PoolClient): Promise<void> {
    await client.query("SELECT pg_advisory_xact_lock_shared(hashtext('schedule_config'))")
}

async function isSlotInScheduleConfig(
    appointmentDatetime: Date,
    config: ScheduleConfigView,
): Promise<boolean> {
    const { dateStr, timeStr } = getLocalParts(appointmentDatetime)
    const ranges = scheduleRangesOf(config)
    const blockedDates = scheduleBlockedDatesOf(config)
    return freeSlotStartsOfDay(dateStr, ranges, blockedDates, config.slotMinutes).includes(toMinutes(timeStr))
}

async function lockSlot(client: PoolClient, slotIso: string): Promise<void> {
    await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('slot:' || $1::text))",
        [slotIso],
    )
}

async function countActiveInSlot(client: PoolClient, appointmentDatetime: Date): Promise<number> {
    const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text as count
         FROM Appointments
         WHERE appointment_datetime = $1
           AND status IN ('PENDING', 'CONFIRMED')`,
        [appointmentDatetime],
    )
    return Number(countResult.rows[0]?.count ?? 0)
}

async function hasActiveAppointmentForCpf(
    client: PoolClient,
    cpfHash: string,
    appointmentDatetime: Date,
): Promise<boolean> {
    const duplicateCheck = await client.query(
        `SELECT 1 FROM Appointments
         WHERE cpf_hash = $1
           AND appointment_datetime = $2
           AND status IN ('PENDING', 'CONFIRMED')`,
        [cpfHash, appointmentDatetime],
    )
    return (duplicateCheck.rowCount ?? 0) > 0
}

async function loadDocumentsSent(
    client: PoolClient,
    byRepresentative: boolean,
    questionId: number,
): Promise<DocumentsSent> {
    const attendeeGroup = byRepresentative
        ? "REPRESENTATIVE"
        : "HOLDER"
    const groupDocsResult = await client.query<{ description: string }>(
        `SELECT description
         FROM AttendanceDocuments
         WHERE attendee_group = $1
         ORDER BY position ASC, id ASC`,
        [attendeeGroup],
    )
    const groupDocs = groupDocsResult.rows.map((r) => r.description)

    const qDocsResult = await client.query<{ description: string }>(
        `SELECT description
         FROM RequiredDocuments
         WHERE question_id = $1
         ORDER BY position ASC, id ASC`,
        [questionId],
    )
    const questionDocs = qDocsResult.rows.map((r) => r.description)

    return {
        group: groupDocs,
        question: questionDocs,
    }
}

async function insertAppointment(
    client: PoolClient,
    input: BookAppointmentInput,
    documentsSent: DocumentsSent,
): Promise<{ id: string; appointment_code: string; appointment_datetime: Date }> {
    const phoneEncrypted = input.phone ? encrypt(input.phone) : null

    const insertResult = await client.query<{
        id: string
        appointment_code: string
        appointment_datetime: Date
    }>(
        `INSERT INTO Appointments (
           session_id, question_id, reason, name, cpf_hash, cpf_masked,
           phone_encrypted, by_representative, documents_sent, appointment_datetime, status
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING'
         ) RETURNING id, appointment_code, appointment_datetime`,
        [
            input.sessionId,
            input.questionId,
            input.reason,
            input.name,
            input.cpfHash,
            input.cpfMasked,
            phoneEncrypted,
            input.byRepresentative,
            JSON.stringify(documentsSent),
            input.appointmentDatetime,
        ],
    )

    const created = insertResult.rows[0]
    if (!created) {
        throw new BookingFailedError()
    }
    return created
}

async function insertCreatedEvent(client: PoolClient, appointmentId: string): Promise<void> {
    await client.query(
        `INSERT INTO AppointmentEvents (appointment_id, type, data)
         VALUES ($1, 'CREATED', '{}'::jsonb)`,
        [appointmentId],
    )
}

async function bookAppointment(
    input: BookAppointmentInput,
): Promise<BookAppointmentResult> {
    const pool = getPool()
    const client = await pool.connect()

    try {
        await client.query("BEGIN")

        await lockScheduleConfigShared(client)
        await lockSlot(client, input.appointmentDatetime.toISOString())

        const { dateStr } = getLocalParts(input.appointmentDatetime)
        const effectiveVersions = await selectScheduledVersions(client, dateStr, dateStr)
        const config = effectiveVersions.at(-1)?.config
        if (!config) {
            throw new ScheduleNotConfiguredError()
        }

        if (!(await isSlotInScheduleConfig(input.appointmentDatetime, config))) {
            throw new SlotFullError()
        }

        const currentActiveCount = await countActiveInSlot(client, input.appointmentDatetime)
        if (currentActiveCount >= config.seatsPerSlot) {
            throw new SlotFullError()
        }

        if (await hasActiveAppointmentForCpf(client, input.cpfHash, input.appointmentDatetime)) {
            throw new DuplicateAppointmentError()
        }

        const documentsSent = await loadDocumentsSent(client, input.byRepresentative, input.questionId)

        const created = await insertAppointment(client, input, documentsSent)

        await insertCreatedEvent(client, created.id)

        await insertConversationEvent(client, input.sessionId, {
            type: "PHONE_NOTICE_SHOWN",
        })

        await finishSessionWith(client, input.sessionId, {
            outcome: "SCHEDULED",
            event: {
                type: "APPOINTMENT_CREATED",
                appointmentId: Number(created.id),
            },
        })

        await client.query("COMMIT")

        const protocol = created.appointment_code.slice(0, 8).toUpperCase()

        return {
            id: created.id,
            appointmentCode: created.appointment_code,
            protocol,
            appointmentDatetime: created.appointment_datetime,
            unitAddress: config.unitAddress,
            unitAddressComplement: config.unitAddressComplement,
            documentsSent,
            reminderEnabled: config.reminderEnabled,
            reminderHours: config.reminderHours,
        }
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}

export function createScheduleRepository(): IScheduleRepository {
    return {
        getSettings,
        getRanges,
        getBlockedDates,
        countActiveAppointmentsPerSlot,
        bookAppointment,
        getConfig,
        getConfigForDate,
        getScheduleVersions,
        listScheduledConfigs,
        saveConfig,
        saveScheduledConfig,
        deleteScheduledConfig,
        listFutureActiveAppointments,
    }
}

export const scheduleRepository = createScheduleRepository()
