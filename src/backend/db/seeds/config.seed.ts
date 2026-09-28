import { PoolClient } from "pg"
import configuracaoInicial from "./data/configuracao-inicial.data"

export type InitialConfigOutcome = "created" | "kept"

async function isEmpty(client: PoolClient, table: "ScheduleRanges" | "AttendanceDocuments"): Promise<boolean> {
    const result = await client.query(`SELECT 1 FROM ${table} LIMIT 1`)
    return result.rowCount === 0
}

export async function seedInitialConfig(client: PoolClient): Promise<InitialConfigOutcome> {
    const existing = await client.query("SELECT 1 FROM ScheduleSettings WHERE id = 1")
    if ((existing.rowCount ?? 0) > 0) {
        return "kept"
    }

    await client.query(
        `INSERT INTO ScheduleSettings
            (id, slot_minutes, seats_per_slot, window_days, min_notice_days, wait_alert_days,
             unit_address, unit_address_complement, reminder_enabled, reminder_hours)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            configuracaoInicial.slotMinutes,
            configuracaoInicial.seatsPerSlot,
            configuracaoInicial.windowDays,
            configuracaoInicial.minNoticeDays,
            configuracaoInicial.waitAlertDays,
            configuracaoInicial.unitAddress,
            configuracaoInicial.unitAddressComplement,
            configuracaoInicial.reminderEnabled,
            configuracaoInicial.reminderHours,
        ]
    )

    if (await isEmpty(client, "ScheduleRanges")) {
        for (const range of configuracaoInicial.scheduleRanges) {
            await client.query(
                "INSERT INTO ScheduleRanges (weekday, slot_index, start_time, end_time) VALUES ($1, $2, $3, $4)",
                [range.weekday, range.slotIndex, range.startTime, range.endTime]
            )
        }
    }

    if (await isEmpty(client, "AttendanceDocuments")) {
        const groups = [
            ["HOLDER", configuracaoInicial.attendanceDocuments.holder],
            ["REPRESENTATIVE", configuracaoInicial.attendanceDocuments.representative],
        ] as const
        for (const [group, documents] of groups) {
            for (const [position, description] of documents.entries()) {
                await client.query(
                    "INSERT INTO AttendanceDocuments (attendee_group, description, position) VALUES ($1, $2, $3)",
                    [group, description, position]
                )
            }
        }
    }

    return "created"
}
