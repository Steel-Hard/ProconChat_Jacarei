import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { NormalizedScheduleConfig } from "../../types/schedule.types"
import { addDaysToDateString, getLocalParts } from "../../utils/date.utils"
import {
    insertScheduleChange,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string

function weekdayConfig(overrides: Partial<NormalizedScheduleConfig> = {}): NormalizedScheduleConfig {
    return {
        slotMinutes: 30,
        seatsPerSlot: 2,
        windowDays: 30,
        minNoticeDays: 0,
        waitAlertDays: 7,
        unitAddress: "Rua do Procon, 100",
        unitAddressComplement: "Sala 1",
        reminderEnabled: true,
        reminderHours: 24,
        ranges: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, slotIndex: 1, startTime: "08:00", endTime: "12:00" })),
        blockedDates: [],
        ...overrides,
    }
}

function bodyOf(config: NormalizedScheduleConfig) {
    return {
        ...config,
        ranges: config.ranges.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
    }
}

interface ChangeRow {
    effective_from: string
    config: NormalizedScheduleConfig
    updated_by: string
    updated_at: string
}

async function changeRows(): Promise<ChangeRow[]> {
    const result = await getPool().query<ChangeRow>(
        `SELECT to_char(effective_from, 'YYYY-MM-DD') AS effective_from, config, updated_by::text AS updated_by,
                updated_at::text AS updated_at
         FROM ScheduleChanges
         ORDER BY effective_from`,
    )
    return result.rows
}

describe("mudanças de horário agendadas com Postgres", () => {
    const createdUserIds: (number | null)[] = []
    let savedSnapshot: ScheduleConfigSnapshot | null = null
    let configurer: TestUser
    let author: TestUser
    let today: string

    async function user(input: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    beforeAll(async () => {
        savedSnapshot = await snapshotScheduleConfig()
        configurer = await user({ permissions: ["schedule.configure"] })
        author = await user({ permissions: ["schedule.configure"] })
    })

    beforeEach(async () => {
        today = getLocalParts(new Date()).dateStr
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 2,
                window_days: 30,
                min_notice_days: 0,
                wait_alert_days: 7,
                unit_address: "Rua do Procon, 100",
                unit_address_complement: "Sala 1",
                reminder_enabled: true,
                reminder_hours: 24,
            },
            ranges: [1, 2, 3, 4, 5].map((weekday) => ({
                weekday,
                slot_index: 1,
                start_time: "08:00",
                end_time: "12:00",
            })),
        })
    })

    afterAll(async () => {
        try {
            if (savedSnapshot) {
                await restoreScheduleConfig(savedSnapshot)
            }
            await deleteTestUsers(createdUserIds)
        } finally {
            await getPool().end()
        }
    })

    it("grava a configuração de hoje como mudança nova a partir de hoje e mantém intacta a que já tinha começado", async () => {
        const yesterday = addDaysToDateString(today, -1)
        await insertScheduleChange(yesterday, weekdayConfig({ seatsPerSlot: 3 }), author.id)
        const [before] = await changeRows()

        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send(bodyOf(weekdayConfig({ seatsPerSlot: 5 })))

        expect(response.status).toBe(200)
        expect(response.body.data).toMatchObject({ effectiveFrom: today, seatsPerSlot: 5 })
        const rows = await changeRows()
        expect(rows.map((row) => [row.effective_from, row.config.seatsPerSlot, row.updated_by])).toEqual([
            [yesterday, 3, String(author.id)],
            [today, 5, String(configurer.id)],
        ])
        expect(rows[0]).toEqual(before)
    })

    it("recusa com 400 no campo o bloqueio novo da configuração de hoje numa data que segue uma mudança distante", async () => {
        const farChange = addDaysToDateString(today, 250)
        await insertScheduleChange(farChange, weekdayConfig(), author.id)
        const blockedDate = addDaysToDateString(farChange, 10)

        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", configurer.cookie)
            .set("Origin", ORIGIN)
            .send(bodyOf(weekdayConfig({
                blockedDates: [{ date: blockedDate, startTime: null, endTime: null, description: "Feriado" }],
            })))

        expect(response.status).toBe(400)
        expect(response.body.error.details.issues).toEqual([
            {
                path: "blockedDates.0.date",
                message: `Esta data segue a mudança de ${farChange.slice(8, 10)}/${farChange.slice(5, 7)}. Bloqueie lá.`,
            },
        ])
        expect(await getPool().query("SELECT 1 FROM BlockedDates")).toMatchObject({ rowCount: 0 })
    })
})
