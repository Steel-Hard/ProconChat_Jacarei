import { randomBytes } from "node:crypto"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { SendTemplateInput, SendTemplateResult } from "../../clients/gateway.client"
import getPool from "../../db/connection"
import { createAppointmentReminderRepository } from "../../repositories/appointmentReminder.repository"
import { outboundMessageRepository } from "../../repositories/outboundMessage.repository"
import { createSweepAppointmentReminders } from "../../services/appointmentReminder.service"
import {
    CORPO_LEMBRETE_ATENDIMENTO,
    MODELO_LEMBRETE_ATENDIMENTO,
    renderizarModelo,
} from "../../services/messageFormatter.service"
import type { AppointmentStatus } from "../../types/appointment.types"
import { encrypt } from "../../utils/crypto.utils"
import { hashProviderMessageId } from "../../utils/providerMessageHash"
import {
    createAppointmentScope,
    createTestAppointment,
    deleteAppointmentScope,
    firstRow,
    OwnedAppointmentScope,
} from "./helpers/appointmentsDb"
import {
    insertScheduleChange,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "./helpers/scheduleDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const NOW = new Date("2034-06-14T17:00:00.000Z")
const HOUR_MS = 60 * 60 * 1000
const PHONE = "5512999990740"

describe("Varredura periódica de lembretes antes do atendimento com Postgres (#74)", () => {
    const createdUserIds: (number | null)[] = []
    const createdWamids: string[] = []
    let admin: TestUser
    let scope: OwnedAppointmentScope
    let scheduleSnapshot: ScheduleConfigSnapshot
    const repository = createAppointmentReminderRepository()

    async function configureBaseSchedule(overrides: {
        reminder_enabled?: boolean
        reminder_hours?: number
        unit_address?: string
        unit_address_complement?: string | null
    } = {}): Promise<void> {
        await useScheduleConfig({
            settings: {
                slot_minutes: 30,
                seats_per_slot: 4,
                window_days: 30,
                min_notice_days: 0,
                wait_alert_days: 7,
                unit_address: overrides.unit_address ?? "Av. Nove de Julho, 215",
                unit_address_complement:
                    overrides.unit_address_complement === undefined ? "Sala 2" : overrides.unit_address_complement,
                reminder_enabled: overrides.reminder_enabled ?? true,
                reminder_hours: overrides.reminder_hours ?? 24,
            },
            ranges: [],
        })
    }

    async function appointment(input: {
        at: Date
        status?: AppointmentStatus
        name?: string
        phone?: string | null
        documentsSent?: { group: string[]; question: string[] }
    }): Promise<number> {
        const id = await createTestAppointment(scope, {
            name: input.name ?? "Maria da Silva",
            status: input.status ?? "PENDING",
            appointmentDatetime: input.at,
            cpfHash: randomBytes(32).toString("hex"),
            documentsSent: input.documentsSent ?? {
                group: ["RG ou CNH guardada no agendamento"],
                question: ["Contrato guardado no agendamento"],
            },
        })
        const phone = input.phone === undefined ? PHONE : input.phone
        await getPool().query("UPDATE Appointments SET phone_encrypted = $2 WHERE id = $1", [
            id,
            phone === null ? null : encrypt(phone),
        ])
        return id
    }

    async function eventsOf(appointmentId: number) {
        const result = await getPool().query<{
            type: string
            actor_user_id: string | null
            data: Record<string, unknown>
            created_at: Date
        }>(
            `SELECT type::text AS type, actor_user_id::text AS actor_user_id, data, created_at
             FROM AppointmentEvents
             WHERE appointment_id = $1
             ORDER BY created_at ASC, id ASC`,
            [appointmentId],
        )
        return result.rows
    }

    async function outboundOf(appointmentId: number) {
        const result = await getPool().query<{
            provider_message_hash: string | null
            kind: string
            status: string
            error_code: string | null
            status_at: Date | null
        }>(
            `SELECT provider_message_hash, kind::text AS kind, status::text AS status, error_code, status_at
             FROM OutboundMessages
             WHERE appointment_id = $1
             ORDER BY id ASC`,
            [appointmentId],
        )
        return result.rows
    }

    function wamid(): string {
        const id = `wamid.reminder.${process.pid}.${Date.now()}.${randomBytes(6).toString("hex")}`
        createdWamids.push(id)
        return id
    }

    beforeAll(async () => {
        admin = await createTestUser({ isAdmin: true })
        createdUserIds.push(admin.createdId)
        scope = await createAppointmentScope(admin.id, "reminder_sweep")
        scheduleSnapshot = await snapshotScheduleConfig()
    })

    afterEach(async () => {
        const pool = getPool()
        if (createdWamids.length > 0) {
            await pool.query("DELETE FROM OutboundMessages WHERE provider_message_hash = ANY($1::text[])", [
                createdWamids.map(hashProviderMessageId),
            ])
            createdWamids.length = 0
        }
        if (scope.createdAppointmentIds.length > 0) {
            await pool.query("DELETE FROM OutboundMessages WHERE appointment_id = ANY($1::bigint[])", [
                scope.createdAppointmentIds,
            ])
            await pool.query("DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])", [
                scope.createdAppointmentIds,
            ])
            await pool.query("DELETE FROM Appointments WHERE id = ANY($1::bigint[])", [scope.createdAppointmentIds])
            scope.createdAppointmentIds.length = 0
        }
        await pool.query("DELETE FROM ScheduleChanges")
    })

    afterAll(async () => {
        await restoreScheduleConfig(scheduleSnapshot)
        await deleteAppointmentScope(scope)
        await deleteTestUsers(createdUserIds)
        await getPool().end()
    })

    it("não envia nada quando o lembrete está desligado na configuração", async () => {
        await configureBaseSchedule({ reminder_enabled: false, reminder_hours: 24 })
        const pendingId = await appointment({ at: new Date(NOW.getTime() + 6 * HOUR_MS), status: "PENDING" })
        const confirmedId = await appointment({ at: new Date(NOW.getTime() + 12 * HOUR_MS), status: "CONFIRMED" })
        const sendTemplate = vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
        const sweep = createSweepAppointmentReminders({
            repository,
            gateway: { sendTemplate },
            clock: () => NOW,
            logger: { log: vi.fn() },
        })

        const sent = await sweep()

        expect(sent).toBe(0)
        expect(sendTemplate).not.toHaveBeenCalled()
        expect(await eventsOf(pendingId)).toEqual([])
        expect(await eventsOf(confirmedId)).toEqual([])
    })

    it("envia só para agendamentos PENDING e CONFIRMED dentro da janela, ignorando CANCELED, ATTENDED, NO_SHOW e fora da janela", async () => {
        await configureBaseSchedule({ reminder_enabled: true, reminder_hours: 24 })
        const pendingId = await appointment({ at: new Date(NOW.getTime() + 2 * HOUR_MS), status: "PENDING" })
        const confirmedExactLimitId = await appointment({
            at: new Date(NOW.getTime() + 24 * HOUR_MS),
            status: "CONFIRMED",
        })
        const canceledId = await appointment({ at: new Date(NOW.getTime() + 4 * HOUR_MS), status: "CANCELED" })
        const attendedId = await appointment({ at: new Date(NOW.getTime() + 4 * HOUR_MS), status: "ATTENDED" })
        const noShowId = await appointment({ at: new Date(NOW.getTime() + 4 * HOUR_MS), status: "NO_SHOW" })
        const atNowId = await appointment({ at: NOW, status: "PENDING" })
        const pastId = await appointment({ at: new Date(NOW.getTime() - 1_000), status: "CONFIRMED" })
        const afterWindowId = await appointment({
            at: new Date(NOW.getTime() + 24 * HOUR_MS + 1_000),
            status: "PENDING",
        })
        const sendTemplate = vi
            .fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
            .mockImplementation(async () => ({ ok: true, providerMessageId: wamid() }))
        const sweep = createSweepAppointmentReminders({
            repository,
            gateway: { sendTemplate },
            clock: () => NOW,
            logger: { log: vi.fn() },
        })

        const sent = await sweep()

        expect(sent).toBe(2)
        expect(sendTemplate).toHaveBeenCalledTimes(2)
        expect((await eventsOf(pendingId)).map((e) => e.type)).toEqual(["REMINDER_SENT"])
        expect((await eventsOf(confirmedExactLimitId)).map((e) => e.type)).toEqual(["REMINDER_SENT"])
        for (const ignoredId of [canceledId, attendedId, noShowId, atNowId, pastId, afterWindowId]) {
            expect(await eventsOf(ignoredId)).toEqual([])
        }
    })

    it("garante envio único por agendamento e usa os documentos guardados no agendamento em vez da configuração atual", async () => {
        await configureBaseSchedule({
            reminder_enabled: true,
            reminder_hours: 24,
            unit_address: "Rua do Procon, 100",
            unit_address_complement: "Sala 1",
        })
        await getPool().query(
            `INSERT INTO RequiredDocuments (question_id, description, position)
             VALUES ($1, 'Documento novo na pergunta que não deve ir no lembrete', 0)`,
            [scope.questionId],
        )
        const apptDatetime = new Date("2034-06-15T17:00:00.000Z")
        const id = await appointment({
            at: apptDatetime,
            status: "CONFIRMED",
            name: "Maria da Silva",
            documentsSent: {
                group: ["RG ou CNH"],
                question: ["comprovante de residência"],
            },
        })
        const protocol = firstRow(
            (
                await getPool().query<{ protocol: string }>(
                    "SELECT UPPER(SUBSTRING(appointment_code::text, 1, 8)) AS protocol FROM Appointments WHERE id = $1",
                    [id],
                )
            ).rows,
        ).protocol
        const msgId = wamid()
        const sendTemplate = vi
            .fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
            .mockResolvedValue({ ok: true, providerMessageId: msgId })
        const sweep = createSweepAppointmentReminders({
            repository,
            gateway: { sendTemplate },
            clock: () => NOW,
            logger: { log: vi.fn() },
        })

        const firstRun = await sweep()
        await getPool().query("UPDATE Appointments SET appointment_datetime = $2 WHERE id = $1", [
            id,
            new Date("2034-06-15T18:00:00.000Z"),
        ])
        const secondRun = await sweep()

        expect(firstRun).toBe(1)
        expect(secondRun).toBe(0)
        expect(sendTemplate).toHaveBeenCalledTimes(1)
        const sentInput = sendTemplate.mock.calls[0]?.[0]
        expect(sentInput).toEqual({
            to: PHONE,
            name: MODELO_LEMBRETE_ATENDIMENTO.name,
            languageCode: MODELO_LEMBRETE_ATENDIMENTO.languageCode,
            bodyParameters: [
                "Maria",
                "quinta-feira",
                "15/06",
                "14:00",
                protocol,
                "Rua do Procon, 100 (Sala 1)",
                "RG ou CNH; comprovante de residência",
            ],
        })
        expect(renderizarModelo(CORPO_LEMBRETE_ATENDIMENTO, sentInput?.bodyParameters ?? [])).toBe(
            `Olá, Maria. Lembrete do seu atendimento no PROCON Jacareí: quinta-feira, 15/06, às 14:00 (protocolo ${protocol}). Endereço: Rua do Procon, 100 (Sala 1). Traga: RG ou CNH; comprovante de residência. Se não puder comparecer, remarque ou cancele respondendo a esta mensagem.`,
        )
        expect(await eventsOf(id)).toEqual([
            {
                type: "REMINDER_SENT",
                actor_user_id: null,
                data: {},
                created_at: NOW,
            },
        ])
        expect(await outboundOf(id)).toEqual([
            {
                provider_message_hash: hashProviderMessageId(msgId),
                kind: "REMINDER",
                status: "SENT",
                error_code: null,
                status_at: NOW,
            },
        ])
        await getPool().query("DELETE FROM RequiredDocuments WHERE question_id = $1", [scope.questionId])
    })

    it("segue a versão agendada vigente na data local do atendimento para lembrete, horas e endereço", async () => {
        await configureBaseSchedule({
            reminder_enabled: false,
            reminder_hours: 2,
            unit_address: "Endereço Base, 10",
            unit_address_complement: "Bloco A",
        })
        await insertScheduleChange(
            "2034-06-15",
            {
                slotMinutes: 30,
                seatsPerSlot: 4,
                windowDays: 30,
                minNoticeDays: 0,
                waitAlertDays: 7,
                unitAddress: "Endereço Novo, 500",
                unitAddressComplement: null,
                reminderEnabled: true,
                reminderHours: 24,
                ranges: [],
                blockedDates: [],
            },
            admin.id,
        )
        const onBaseDateId = await appointment({
            at: new Date("2034-06-14T18:00:00.000Z"),
            status: "PENDING",
        })
        const onChangedDateId = await appointment({
            at: new Date("2034-06-15T15:00:00.000Z"),
            status: "CONFIRMED",
        })
        const sendTemplate = vi
            .fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
            .mockImplementation(async () => ({ ok: true, providerMessageId: wamid() }))
        const sweep = createSweepAppointmentReminders({
            repository,
            gateway: { sendTemplate },
            clock: () => NOW,
            logger: { log: vi.fn() },
        })

        const sent = await sweep()

        expect(sent).toBe(1)
        expect(sendTemplate).toHaveBeenCalledTimes(1)
        expect(sendTemplate.mock.calls[0]?.[0]?.bodyParameters[5]).toBe("Endereço Novo, 500")
        expect(await eventsOf(onBaseDateId)).toEqual([])
        expect((await eventsOf(onChangedDateId)).map((e) => e.type)).toEqual(["REMINDER_SENT"])
    })

    it("registra falha de entrega quando o webhook FAILED chega antes ou depois da gravação do lembrete", async () => {
        await configureBaseSchedule({ reminder_enabled: true, reminder_hours: 24 })
        const afterId = await appointment({ at: new Date(NOW.getTime() + 3 * HOUR_MS), status: "PENDING" })
        const beforeId = await appointment({ at: new Date(NOW.getTime() + 4 * HOUR_MS), status: "CONFIRMED" })
        const wamidAfter = wamid()
        const wamidBefore = wamid()
        const failedAt = new Date(NOW.getTime() + 5_000)

        await outboundMessageRepository.applyStatuses(
            [{ providerMessageId: wamidBefore, status: "FAILED", statusAt: NOW, errorCode: "131026" }],
            NOW,
        )
        await repository.recordReminderOutcome(String(afterId), "SENT", NOW, wamidAfter)
        await repository.recordReminderOutcome(String(beforeId), "SENT", NOW, wamidBefore)
        await outboundMessageRepository.applyStatuses(
            [{ providerMessageId: wamidAfter, status: "FAILED", statusAt: failedAt, errorCode: "131047" }],
            failedAt,
        )

        expect(await eventsOf(afterId)).toEqual([
            { type: "REMINDER_SENT", actor_user_id: null, data: {}, created_at: NOW },
            {
                type: "CITIZEN_NOTIFICATION_FAILED",
                actor_user_id: null,
                data: { kind: "REMINDER" },
                created_at: failedAt,
            },
        ])
        expect(await eventsOf(beforeId)).toEqual([
            { type: "REMINDER_SENT", actor_user_id: null, data: {}, created_at: NOW },
            {
                type: "CITIZEN_NOTIFICATION_FAILED",
                actor_user_id: null,
                data: { kind: "REMINDER" },
                created_at: new Date(NOW.getTime() + 1),
            },
        ])
        const failures = await outboundMessageRepository.listRecentFailures(new Date(NOW.getTime() - 1_000), 50)
        expect(failures.items.filter((item) => item.appointmentId === String(afterId))).toEqual([
            {
                id: expect.any(String),
                kind: "REMINDER",
                errorCode: "131047",
                failedAt,
                appointmentId: String(afterId),
            },
        ])
    })
})
