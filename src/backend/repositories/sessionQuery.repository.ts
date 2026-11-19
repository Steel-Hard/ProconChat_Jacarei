import getPool from "../db/connection";
import NotFoundError from "../errors/NotFoundError";
import {
  addDaysToDateString,
  parseLocalDate,
  toLocalDateString,
} from "../utils/date.utils";
import type {
  SessionDetail,
  SessionListFilters,
  SessionListResponse,
  SessionOutcome,
} from "../types/session.types";

export function resolveSessionRange(
  filters: Pick<SessionListFilters, "period" | "from" | "to">,
  now: Date,
): { start: Date; end: Date } {
  const today = toLocalDateString(now);
  const dayStart = (day: string) => parseLocalDate(day, "00:00");
  const firstOfMonth = (day: string) => `${day.slice(0, 8)}01`;
  const tomorrow = dayStart(addDaysToDateString(today, 1));

  if (filters.period === "current_month") {
    return { start: dayStart(firstOfMonth(today)), end: tomorrow };
  }
  if (filters.period === "previous_month") {
    const currentFirst = firstOfMonth(today);
    const previousLast = addDaysToDateString(currentFirst, -1);
    return {
      start: dayStart(firstOfMonth(previousLast)),
      end: dayStart(currentFirst),
    };
  }
  if (filters.period === "custom") {
    let first = filters.from || addDaysToDateString(today, -30);
    let last = filters.to || today;
    if (last > today) last = today;
    if (first > last) [first, last] = [last, first];
    return {
      start: dayStart(first),
      end: dayStart(addDaysToDateString(last, 1)),
    };
  }
  const days = Number(filters.period);
  return {
    start: dayStart(addDaysToDateString(today, -(days - 1))),
    end: tomorrow,
  };
}

function periodCondition(
  filters: SessionListFilters,
  now: Date,
  params: unknown[],
): string {
  const range = resolveSessionRange(filters, now);
  params.push(range.start);
  params.push(range.end);
  return `s.started_at >= $${params.length - 1} AND s.started_at < $${params.length}`;
}

function searchCondition(paramIndex: number): string {
  return `(
                UPPER(REPLACE(s.session_code::text, '-', '')) LIKE UPPER('%' || REPLACE($${paramIndex}, '-', '') || '%')
                OR EXISTS (
                    SELECT 1 FROM Appointments apt
                    WHERE UPPER(SUBSTRING(apt.appointment_code::text, 1, 8)) LIKE UPPER('%' || $${paramIndex} || '%')
                      AND (
                        apt.session_id = s.id
                        OR EXISTS (
                            SELECT 1 FROM ConversationEvents ce
                            WHERE ce.session_id = s.id AND ce.appointment_id = apt.id
                        )
                      )
                )
            )`;
}

function categoryCondition(paramIndex: number): string {
  return `(
                EXISTS (
                    SELECT 1 FROM ConversationEvents ce
                    WHERE ce.session_id = s.id AND ce.category_id = $${paramIndex}
                )
                OR EXISTS (
                    SELECT 1 FROM ConversationEvents ce
                    JOIN Appointments apt ON apt.id = ce.appointment_id
                    JOIN Questions aq ON aq.id = apt.question_id
                    WHERE ce.session_id = s.id AND aq.category_id = $${paramIndex}
                )
            )`;
}

function appointmentAction(
  type: string | null,
): "CREATED" | "RESCHEDULED" | "CANCELED" | null {
  if (type === "APPOINTMENT_CREATED") return "CREATED";
  if (type === "APPOINTMENT_RESCHEDULED") return "RESCHEDULED";
  if (type === "APPOINTMENT_CANCELED") return "CANCELED";
  return null;
}

export class SessionQueryRepository {
  async list(filters: SessionListFilters): Promise<SessionListResponse> {
    const pool = getPool();
    const now = new Date();
    const params: unknown[] = [];
    const conditions: string[] = [];
    const search = filters.search?.trim();
    if (search) {
      params.push(search);
      conditions.push(searchCondition(params.length));
    } else {
      conditions.push(periodCondition(filters, now, params));
      if (filters.categoryId) {
        params.push(filters.categoryId);
        conditions.push(categoryCondition(params.length));
      }
      if (filters.outcome !== "all") {
        params.push(filters.outcome);
        conditions.push(`s.outcome = $${params.length}::session_outcome`);
      }
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countParams = [...params];
    const count = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM Sessions s ${where}`,
      countParams,
    );
    const total = Number(count.rows[0]?.total ?? 0);
    const limit = filters.limit;
    const page = Math.min(filters.page, Math.max(1, Math.ceil(total / limit)));
    params.push(limit);
    const limitParam = `$${params.length}`;
    params.push((page - 1) * limit);
    const offsetParam = `$${params.length}`;

    const result = await pool.query<{
      id: string;
      code: string;
      started_at: Date;
      outcome: SessionOutcome;
      current_step: string | null;
      category_name: string | null;
      question_title: string | null;
      appointment_id: string | null;
      protocol: string | null;
      appointment_action: string | null;
    }>(
      `WITH filtered AS (
                SELECT s.* FROM Sessions s ${where}
            )
            SELECT s.id::text AS id, s.session_code::text AS code, s.started_at, s.outcome,
                   CASE WHEN s.status = 'IN_PROGRESS' THEN s.current_step ELSE NULL END AS current_step,
                   COALESCE(c.title, ac.title) AS category_name, q.question AS question_title,
                   apt.id::text AS appointment_id,
                   UPPER(SUBSTRING(apt.appointment_code::text, 1, 8)) AS protocol,
                   (SELECT ce.type::text FROM ConversationEvents ce
                    WHERE ce.session_id = s.id
                      AND ce.type IN ('APPOINTMENT_CREATED','APPOINTMENT_RESCHEDULED','APPOINTMENT_CANCELED')
                    ORDER BY ce.created_at DESC, ce.id DESC LIMIT 1) AS appointment_action
            FROM filtered s
            LEFT JOIN LATERAL (
                SELECT ce.category_id FROM ConversationEvents ce
                WHERE ce.session_id = s.id AND ce.category_id IS NOT NULL
                ORDER BY ce.created_at DESC, ce.id DESC LIMIT 1
            ) last_category ON TRUE
            LEFT JOIN Categories c ON c.id = last_category.category_id
            LEFT JOIN LATERAL (
                SELECT ce.question_id FROM ConversationEvents ce
                WHERE ce.session_id = s.id AND ce.question_id IS NOT NULL
                ORDER BY ce.created_at DESC, ce.id DESC LIMIT 1
            ) last_question ON TRUE
            LEFT JOIN Questions q ON q.id = last_question.question_id
            LEFT JOIN LATERAL (
                SELECT a.* FROM Appointments a
                WHERE a.session_id = s.id OR EXISTS (
                    SELECT 1 FROM ConversationEvents ce
                    WHERE ce.session_id = s.id AND ce.appointment_id = a.id
                )
                ORDER BY a.id DESC LIMIT 1
            ) apt ON TRUE
            LEFT JOIN Questions aq ON aq.id = apt.question_id
            LEFT JOIN Categories ac ON ac.id = aq.category_id
            ORDER BY s.started_at DESC, s.id DESC
            LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params,
    );

    const chipParams: unknown[] = [];
    const chipConditions: string[] = [];
    if (!search) {
      chipConditions.push(periodCondition(filters, now, chipParams));
      if (filters.categoryId) {
        chipParams.push(filters.categoryId);
        chipConditions.push(categoryCondition(chipParams.length));
      }
    } else {
      chipParams.push(search);
      chipConditions.push(searchCondition(chipParams.length));
    }
    const chipWhere = chipConditions.length
      ? `WHERE ${chipConditions.join(" AND ")}`
      : "";
    const chips = await pool.query<{ key: string; count: string }>(
      `SELECT s.outcome::text AS key, COUNT(*)::text AS count
             FROM Sessions s ${chipWhere}
             GROUP BY s.outcome`,
      chipParams,
    );
    const chipCounts = {
      all: chips.rows.reduce((sum, row) => sum + Number(row.count), 0),
      resolved: 0,
      scheduled: 0,
      out_of_scope: 0,
      no_slot: 0,
      declined: 0,
      managed_appointment: 0,
      abandoned: 0,
      in_progress: 0,
    };
    for (const row of chips.rows) {
      if (row.key === "RESOLVED") chipCounts.resolved = Number(row.count);
      if (row.key === "SCHEDULED") chipCounts.scheduled = Number(row.count);
      if (row.key === "OUT_OF_SCOPE")
        chipCounts.out_of_scope = Number(row.count);
      if (row.key === "NO_SLOT") chipCounts.no_slot = Number(row.count);
      if (row.key === "DECLINED") chipCounts.declined = Number(row.count);
      if (row.key === "MANAGED_APPOINTMENT")
        chipCounts.managed_appointment = Number(row.count);
      if (row.key === "ABANDONED") chipCounts.abandoned = Number(row.count);
      if (row.key === "IN_PROGRESS") chipCounts.in_progress = Number(row.count);
    }

    const categories = await pool.query<{ id: string; name: string }>(
      `SELECT id::text AS id, title AS name FROM Categories ORDER BY position, id`,
    );

    return {
      items: result.rows.map((row) => ({
        id: row.id,
        code: row.code,
        started_at: new Date(row.started_at).toISOString(),
        outcome: row.outcome,
        current_step: row.current_step,
        category_name: row.category_name,
        question_title: row.question_title,
        appointment:
          row.appointment_id && row.protocol
            ? {
                id: row.appointment_id,
                protocol: row.protocol,
                action: appointmentAction(row.appointment_action),
              }
            : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      chipCounts,
      categories: categories.rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
      })),
    };
  }

  async detail(code: string): Promise<SessionDetail> {
    const pool = getPool();
    const session = await pool.query<{
      id: string;
      code: string;
      started_at: Date;
      ended_at: Date | null;
      outcome: SessionOutcome;
      current_step: string;
      phone_hash: string | null;
      anonymized_at: Date | null;
      category_name: string | null;
      question_title: string | null;
    }>(
      `SELECT s.id::text AS id, s.session_code::text AS code, s.started_at, s.ended_at, s.outcome,
                    s.current_step, s.phone_hash, s.anonymized_at,
                    (SELECT c.title FROM ConversationEvents ce JOIN Categories c ON c.id = ce.category_id
                     WHERE ce.session_id = s.id ORDER BY ce.created_at DESC, ce.id DESC LIMIT 1) AS category_name,
                    (SELECT q.question FROM ConversationEvents ce JOIN Questions q ON q.id = ce.question_id
                     WHERE ce.session_id = s.id ORDER BY ce.created_at DESC, ce.id DESC LIMIT 1) AS question_title
             FROM Sessions s WHERE s.session_code::text = $1 LIMIT 1`,
      [code],
    );
    const row = session.rows[0];
    if (!row) throw new NotFoundError("Sessão não encontrada");

    const events = await pool.query<{
      id: string;
      type: string;
      created_at: Date;
      category_name: string | null;
      question_title: string | null;
      data: Record<string, unknown>;
      appointment_id: string | null;
      protocol: string | null;
    }>(
      `SELECT ce.id::text AS id, ce.type::text AS type, ce.created_at,
                    c.title AS category_name, q.question AS question_title, ce.data,
                    ce.appointment_id::text AS appointment_id,
                    UPPER(SUBSTRING(a.appointment_code::text, 1, 8)) AS protocol
             FROM ConversationEvents ce
             LEFT JOIN Categories c ON c.id = ce.category_id
             LEFT JOIN Questions q ON q.id = ce.question_id
             LEFT JOIN Appointments a ON a.id = ce.appointment_id
             WHERE ce.session_id = $1
             ORDER BY ce.created_at, ce.id`,
      [row.id],
    );

    let others: SessionDetail["other_sessions"] = [];
    if (row.phone_hash && !row.anonymized_at) {
      const result = await pool.query<{
        id: string;
        code: string;
        started_at: Date;
        outcome: SessionOutcome;
      }>(
        `SELECT id::text AS id, session_code::text AS code, started_at, outcome
                 FROM Sessions
                 WHERE phone_hash = $1 AND id <> $2
                 ORDER BY started_at DESC, id DESC`,
        [row.phone_hash, row.id],
      );
      others = result.rows.map((item) => ({
        id: item.id,
        code: item.code,
        started_at: new Date(item.started_at).toISOString(),
        outcome: item.outcome,
      }));
    }

    const appointmentResult = await pool.query<{
      id: string;
      protocol: string;
      action: string;
      category_name: string | null;
    }>(
      `SELECT a.id::text AS id, UPPER(SUBSTRING(a.appointment_code::text, 1, 8)) AS protocol,
                    (SELECT c.title FROM Questions aq JOIN Categories c ON c.id = aq.category_id
                     WHERE aq.id = a.question_id) AS category_name,
                    (SELECT ce.type::text FROM ConversationEvents ce
                     WHERE ce.session_id = $1 AND ce.appointment_id = a.id
                       AND ce.type IN ('APPOINTMENT_CREATED','APPOINTMENT_RESCHEDULED','APPOINTMENT_CANCELED')
                     ORDER BY ce.created_at DESC, ce.id DESC LIMIT 1) AS action
             FROM Appointments a
             WHERE a.session_id = $1 OR EXISTS (
                 SELECT 1 FROM ConversationEvents ce
                 WHERE ce.session_id = $1 AND ce.appointment_id = a.id
             )
             ORDER BY a.id DESC LIMIT 1`,
      [row.id],
    );
    const appointmentRow = appointmentResult.rows[0];

    return {
      id: row.id,
      code: row.code,
      started_at: new Date(row.started_at).toISOString(),
      ended_at: row.ended_at ? new Date(row.ended_at).toISOString() : null,
      outcome: row.outcome,
      current_step: row.outcome === "IN_PROGRESS" ? row.current_step : null,
      category_name: row.category_name ?? appointmentRow?.category_name ?? null,
      question_title: row.question_title,
      appointment: appointmentRow
        ? {
            id: appointmentRow.id,
            protocol: appointmentRow.protocol,
            action: appointmentAction(appointmentRow.action),
          }
        : null,
      timeline: events.rows.map((event) => ({
        id: event.id,
        type: event.type,
        created_at: new Date(event.created_at).toISOString(),
        category_name: event.category_name,
        question_title: event.question_title,
        data: event.data ?? {},
        appointment:
          event.appointment_id && event.protocol
            ? { id: event.appointment_id, protocol: event.protocol }
            : null,
      })),
      other_sessions: others,
      anonymized: Boolean(row.anonymized_at),
    };
  }
}

export const sessionQueryRepository = new SessionQueryRepository();
