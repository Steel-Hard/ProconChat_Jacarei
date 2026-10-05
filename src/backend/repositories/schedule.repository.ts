import getPool from "../db/connection"
import {
  BlockedDate,
  BookAppointmentInput,
  BookAppointmentResult,
  DocumentsSent,
  ScheduleRange,
  ScheduleSettings,
} from "../types/schedule.types"
import { encrypt } from "../utils/crypto.utils"
import { IScheduleRepository } from "./schedule.repository.interface"

export class PgScheduleRepository implements IScheduleRepository {
  async getSettings(): Promise<ScheduleSettings | null> {
    const pool = getPool()
    const result = await pool.query<ScheduleSettings>(
      `SELECT id, slot_minutes, seats_per_slot, window_days, min_notice_days,
              wait_alert_days, unit_address, unit_address_complement,
              reminder_enabled, reminder_hours
       FROM ScheduleSettings
       WHERE id = 1`,
    )
    return result.rows[0] ?? null
  }

  async getRanges(): Promise<ScheduleRange[]> {
    const pool = getPool()
    const result = await pool.query<ScheduleRange>(
      `SELECT id, weekday, slot_index, start_time::text, end_time::text
       FROM ScheduleRanges
       ORDER BY weekday, slot_index`,
    )
    return result.rows
  }

  async getBlockedDates(
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

  async getAttendanceDocuments(
    group: "HOLDER" | "REPRESENTATIVE",
  ): Promise<string[]> {
    const pool = getPool()
    const result = await pool.query<{ description: string }>(
      `SELECT description
       FROM AttendanceDocuments
       WHERE attendee_group = $1
       ORDER BY position ASC, id ASC`,
      [group],
    )
    return result.rows.map((r) => r.description)
  }

  async getQuestionDocuments(questionId: number): Promise<string[]> {
    const pool = getPool()
    const result = await pool.query<{ description: string }>(
      `SELECT description
       FROM RequiredDocuments
       WHERE question_id = $1
       ORDER BY position ASC, id ASC`,
      [questionId],
    )
    return result.rows.map((r) => r.description)
  }

  async countActiveAppointmentsPerSlot(
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

  async bookAppointment(
    input: BookAppointmentInput,
  ): Promise<BookAppointmentResult> {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Concorrência: Trava consultiva (advisory lock) na transação para o horário exato
      const slotIso = input.appointmentDatetime.toISOString()
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('slot:' || $1::text))",
        [slotIso],
      )

      // Busca configurações de vagas
      const settingsResult = await client.query<ScheduleSettings>(
        `SELECT id, slot_minutes, seats_per_slot, window_days, min_notice_days,
                wait_alert_days, unit_address, unit_address_complement,
                reminder_enabled, reminder_hours
         FROM ScheduleSettings
         WHERE id = 1`,
      )
      const settings = settingsResult.rows[0]
      if (!settings) {
        throw new Error("Agenda não configurada")
      }

      // Verifica capacidade restante no horário
      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text as count
         FROM Appointments
         WHERE appointment_datetime = $1
           AND status IN ('PENDING', 'CONFIRMED')`,
        [input.appointmentDatetime],
      )
      const currentActiveCount = Number(countResult.rows[0]?.count ?? 0)

      if (currentActiveCount >= settings.seats_per_slot) {
        throw new Error("SLOT_FULL")
      }

      // Verifica se o CPF já possui agendamento ativo neste mesmo horário
      const duplicateCheck = await client.query(
        `SELECT 1 FROM Appointments
         WHERE cpf_hash = $1
           AND appointment_datetime = $2
           AND status IN ('PENDING', 'CONFIRMED')`,
        [input.cpfHash, input.appointmentDatetime],
      )
      if ((duplicateCheck.rowCount ?? 0) > 0) {
        throw new Error("DUPLICATE_APPOINTMENT")
      }

      // Documentos do grupo
      const attendeeGroup = input.byRepresentative
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

      // Documentos da pergunta
      const qDocsResult = await client.query<{ description: string }>(
        `SELECT description
         FROM RequiredDocuments
         WHERE question_id = $1
         ORDER BY position ASC, id ASC`,
        [input.questionId],
      )
      const questionDocs = qDocsResult.rows.map((r) => r.description)

      const documentsSent: DocumentsSent = {
        group: groupDocs,
        question: questionDocs,
      }

      const phoneEncrypted = input.phone ? encrypt(input.phone) : null

      // Criação do agendamento
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
        throw new Error("Falha ao inserir agendamento")
      }

      // Registra evento CREATED no histórico do agendamento
      await client.query(
        `INSERT INTO AppointmentEvents (appointment_id, type, data)
         VALUES ($1, 'CREATED', '{}'::jsonb)`,
        [created.id],
      )

      // Registra evento APPOINTMENT_CREATED na sessão da conversa
      await client.query(
        `INSERT INTO ConversationEvents (session_id, type, question_id, appointment_id, data)
         VALUES ($1, 'APPOINTMENT_CREATED', $2, $3, '{}'::jsonb)`,
        [input.sessionId, input.questionId, created.id],
      )

      // Finaliza a sessão com desfecho SCHEDULED e limpa o draft
      await client.query(
        `UPDATE Sessions
         SET status = 'FINISHED',
             outcome = 'SCHEDULED',
             draft = NULL,
             ended_at = now(),
             last_interaction_at = now(),
             current_step = 'FINISHED'
         WHERE id = $1`,
        [input.sessionId],
      )

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
}
