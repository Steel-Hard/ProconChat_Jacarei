import type { PoolClient } from "pg"
import getPool from "../db/connection"
import BookingFailedError from "../errors/BookingFailedError"
import DuplicateAppointmentError from "../errors/DuplicateAppointmentError"
import ScheduleNotConfiguredError from "../errors/ScheduleNotConfiguredError"
import SlotFullError from "../errors/SlotFullError"
import {
    BlockedDate,
    BookAppointmentInput,
    BookAppointmentResult,
    DocumentsSent,
    ScheduleRange,
    ScheduleSettings,
} from "../types/schedule.types"
import { encrypt } from "../utils/crypto.utils"
import { insertConversationEvent, Queryable } from "./conversationEvent.repository"
import { finishSessionWith } from "./session.repository"
import { IScheduleRepository } from "./schedule.repository.interface"

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

async function getRanges(): Promise<ScheduleRange[]> {
    const pool = getPool()
    const result = await pool.query<ScheduleRange>(
        `SELECT id, weekday, slot_index, start_time::text, end_time::text
         FROM ScheduleRanges
         ORDER BY weekday, slot_index`,
    )
    return result.rows
}

async function getBlockedDates(
    fromDate: string,
    toDate: string,
): Promise<BlockedDate[]> {
    const pool = getPool()
    const result = await pool.query<BlockedDate>(
        `SELECT id, date::text, start_time::text, end_time::text, description
         FROM BlockedDates
         WHERE date >= $1 AND date <= $2
         ORDER BY date`,
        [fromDate, toDate],
    )
    return result.rows
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

        await lockSlot(client, input.appointmentDatetime.toISOString())

        const settings = await selectSettings(client)
        if (!settings) {
            throw new ScheduleNotConfiguredError()
        }

        const currentActiveCount = await countActiveInSlot(client, input.appointmentDatetime)
        if (currentActiveCount >= settings.seats_per_slot) {
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
            unitAddress: settings.unit_address,
            unitAddressComplement: settings.unit_address_complement,
            documentsSent,
            reminderEnabled: settings.reminder_enabled,
            reminderHours: settings.reminder_hours,
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
    }
}

export const scheduleRepository = createScheduleRepository()
