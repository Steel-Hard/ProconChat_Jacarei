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
import { insertScheduleChange } from "./helpers/scheduleDb"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const NOW = new Date("2034-06-14T17:00:00.000Z")
const HOUR_MS = 60 * 60 * 1000
const PHONE = "5512999990740"
const BASE_VERSION_DATE = "2034-01-01"

describe("Varredura periódica de lembretes antes do atendimento com Postgres (#74)", () => {
    const createdUserIds: (number | null)[] = []
    const createdWamids: string[] = []
    let admin: TestUser
    let scope: OwnedAppointmentScope
    const realRepository = createAppointmentReminderRepository()
    const repository = {
        ...realRepository,
        async findDueTargets(now: Date) {
            const targets = await realRepository.findDueTargets(now)
            const owned = new Set(scope.createdAppointmentIds.map(String))
            return targets.filter((target) => owned.has(target.id))
        },
    }

    async function configureBaseSchedule(overrides: {
        reminder_enabled?: boolean
        reminder_hours?: number
        unit_address?: string
        unit_address_complement?: string | null
    } = {}): Promise<void> {
        await insertScheduleChange(
            BASE_VERSION_DATE,
            {
                slotMinutes: 30,
                seatsPerSlot: 4,
                windowDays: 30,
                minNoticeDays: 0,
                waitAlertDays: 7,
                unitAddress: overrides.unit_address ?? "Av. Nove de Julho, 215",
                unitAddressComplement:
                    overrides.unit_address_complement === undefined ? "Sala 2" : overrides.unit_address_complement,
                reminderEnabled: overrides.reminder_enabled ?? true,
                reminderHours: overrides.reminder_hours ?? 24,
                ranges: [],
                blockedDates: [],
            },
            admin.id,
        )
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

    async function addEvent(appointmentId: number, type: "CREATED" | "RESCHEDULED", at: Date): Promise<void> {
        await getPool().query(
            `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
             VALUES ($1, $2::appointment_event_type, NULL, '{}'::jsonb, $3)`,
            [appointmentId, type, at],
        )
    }

    function newSweep(
        gateway: Parameters<typeof createSweepAppointmentReminders>[0]["gateway"],
        repo: Parameters<typeof createSweepAppointmentReminders>[0]["repository"] = repository,
    ) {
        return createSweepAppointmentReminders({
            repository: repo,
            gateway,
            clock: () => NOW,
            logger: { log: vi.fn() },
        })
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
        const occupied = await getPool().query(
            "SELECT effective_from::text AS effective_from FROM ScheduleChanges WHERE effective_from >= $1::date",
            [BASE_VERSION_DATE],
        )
        if ((occupied.rowCount ?? 0) > 0) {
            throw new Error("Já existe versão agendada de Horários a partir de 2034-01-01; o teste não vai sobrescrevê-la")
        }
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
        await pool.query("DELETE FROM ScheduleChanges WHERE updated_by = $1 AND effective_from >= $2::date", [
            admin.id,
            BASE_VERSION_DATE,
        ])
    })

    afterAll(async () => {
        await getPool().query("DELETE FROM ScheduleChanges WHERE updated_by = $1 AND effective_from >= $2::date", [
            admin.id,
            BASE_VERSION_DATE,
        ])
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

    it("envia uma vez por data marcada, usa os documentos guardados no agendamento e manda novo lembrete se o cidadão remarcar", async () => {
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
        const repeatedRun = await sweep()
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
        expect(firstRun).toBe(1)
        expect(repeatedRun).toBe(0)
        expect(sendTemplate).toHaveBeenCalledTimes(1)
        expect(await eventsOf(id)).toEqual([
            {
                type: "REMINDER_SENT",
                actor_user_id: null,
                data: { appointmentDatetime: apptDatetime.toISOString() },
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

        const farDatetime = new Date("2034-06-17T17:00:00.000Z")
        await getPool().query("UPDATE Appointments SET appointment_datetime = $2 WHERE id = $1", [id, farDatetime])
        await getPool().query("UPDATE Appointments SET appointment_datetime = $2 WHERE id = $1", [id, apptDatetime])
        const backToOldDate = await sweep()

        expect(backToOldDate).toBe(0)
        expect(sendTemplate).toHaveBeenCalledTimes(1)

        await getPool().query("UPDATE Appointments SET appointment_datetime = $2 WHERE id = $1", [id, farDatetime])
        await addEvent(id, "RESCHEDULED", NOW)
        const sweepOnEve = createSweepAppointmentReminders({
            repository,
            gateway: { sendTemplate },
            clock: () => new Date("2034-06-16T18:00:00.000Z"),
            logger: { log: vi.fn() },
        })
        const afterReschedule = await sweepOnEve()
        const afterRescheduleAgain = await sweepOnEve()

        expect(afterReschedule).toBe(1)
        expect(afterRescheduleAgain).toBe(0)
        expect(sendTemplate).toHaveBeenCalledTimes(2)
        expect(sendTemplate.mock.calls[1]?.[0]?.bodyParameters.slice(2, 4)).toEqual(["17/06", "14:00"])
        expect(
            (await eventsOf(id)).filter((e) => e.type === "REMINDER_SENT").map((e) => e.data.appointmentDatetime),
        ).toEqual([apptDatetime.toISOString(), farDatetime.toISOString()])
        await getPool().query("DELETE FROM RequiredDocuments WHERE question_id = $1", [scope.questionId])
    })

    it("não envia lembrete para agendamento criado ou remarcado para dentro da janela do lembrete", async () => {
        await configureBaseSchedule({ reminder_enabled: true, reminder_hours: 6 })
        const bornInsideId = await appointment({ at: new Date(NOW.getTime() + 3 * HOUR_MS) })
        await addEvent(bornInsideId, "CREATED", new Date(NOW.getTime() - HOUR_MS))
        const movedInsideId = await appointment({ at: new Date(NOW.getTime() + 4 * HOUR_MS) })
        await addEvent(movedInsideId, "CREATED", new Date(NOW.getTime() - 48 * HOUR_MS))
        await addEvent(movedInsideId, "RESCHEDULED", new Date(NOW.getTime() - HOUR_MS))
        const bornOutsideId = await appointment({ at: new Date(NOW.getTime() + 5 * HOUR_MS) })
        await addEvent(bornOutsideId, "CREATED", new Date(NOW.getTime() - 48 * HOUR_MS))
        const sendTemplate = vi
            .fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
            .mockImplementation(async () => ({ ok: true, providerMessageId: wamid() }))

        const sent = await newSweep({ sendTemplate })()

        expect(sent).toBe(1)
        expect(sendTemplate).toHaveBeenCalledTimes(1)
        expect((await eventsOf(bornOutsideId)).map((e) => e.type)).toEqual(["CREATED", "REMINDER_SENT"])
        expect((await eventsOf(bornInsideId)).map((e) => e.type)).toEqual(["CREATED"])
        expect((await eventsOf(movedInsideId)).map((e) => e.type)).toEqual(["CREATED", "RESCHEDULED"])
    })

    it("falha passageira do gateway não grava nada e o lembrete sai na varredura seguinte", async () => {
        await configureBaseSchedule({ reminder_enabled: true, reminder_hours: 24 })
        const id = await appointment({ at: new Date(NOW.getTime() + 3 * HOUR_MS) })
        const sendTemplate = vi
            .fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
            .mockResolvedValueOnce({ ok: false, reason: "UNREACHABLE" })
            .mockResolvedValueOnce({ ok: false, reason: "NOT_CONFIGURED" })
            .mockImplementation(async () => ({ ok: true, providerMessageId: wamid() }))
        const sweep = newSweep({ sendTemplate })

        expect(await sweep()).toBe(0)
        expect(await sweep()).toBe(0)
        expect(await eventsOf(id)).toEqual([])
        expect(await outboundOf(id)).toEqual([])
        expect(await sweep()).toBe(1)
        expect((await eventsOf(id)).map((e) => e.type)).toEqual(["REMINDER_SENT"])
        expect(sendTemplate).toHaveBeenCalledTimes(3)
    })

    it("falha definitiva da Meta grava o código no evento e em OutboundMessages e não repete", async () => {
        await configureBaseSchedule({ reminder_enabled: true, reminder_hours: 24 })
        const id = await appointment({ at: new Date(NOW.getTime() + 3 * HOUR_MS) })
        const sendTemplate = vi
            .fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
            .mockResolvedValue({ ok: false, reason: "REJECTED", errorCode: "132001" })
        const sweep = newSweep({ sendTemplate })

        expect(await sweep()).toBe(0)
        expect(await sweep()).toBe(0)

        expect(sendTemplate).toHaveBeenCalledTimes(1)
        expect(await eventsOf(id)).toEqual([
            {
                type: "CITIZEN_NOTIFICATION_FAILED",
                actor_user_id: null,
                data: {
                    kind: "REMINDER",
                    errorCode: "132001",
                    appointmentDatetime: new Date(NOW.getTime() + 3 * HOUR_MS).toISOString(),
                },
                created_at: NOW,
            },
        ])
        expect(await outboundOf(id)).toEqual([
            { provider_message_hash: null, kind: "REMINDER", status: "FAILED", error_code: "132001", status_at: NOW },
        ])
    })

    it("não envia se o agendamento foi cancelado depois da busca, e registra a mensagem se o cancelamento vier durante o envio", async () => {
        await configureBaseSchedule({ reminder_enabled: true, reminder_hours: 24 })
        const canceledBeforeId = await appointment({ at: new Date(NOW.getTime() + 3 * HOUR_MS) })
        const canceledDuringId = await appointment({ at: new Date(NOW.getTime() + 4 * HOUR_MS) })
        const cancel = (id: number) =>
            getPool().query("UPDATE Appointments SET status = 'CANCELED' WHERE id = $1", [id])
        const sendTemplate = vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>().mockImplementation(async () => {
            await cancel(canceledDuringId)
            return { ok: true, providerMessageId: wamid() }
        })
        const racingRepository = {
            ...repository,
            async findDueTargets(now: Date) {
                const targets = await repository.findDueTargets(now)
                await cancel(canceledBeforeId)
                return targets
            },
        }

        const sent = await newSweep({ sendTemplate }, racingRepository)()

        expect(sent).toBe(1)
        expect(sendTemplate).toHaveBeenCalledTimes(1)
        expect(await eventsOf(canceledBeforeId)).toEqual([])
        expect(await outboundOf(canceledBeforeId)).toEqual([])
        expect((await eventsOf(canceledDuringId)).map((e) => e.type)).toEqual(["REMINDER_SENT"])
        expect((await outboundOf(canceledDuringId)).map((o) => o.status)).toEqual(["SENT"])
    })

    it("um erro em um agendamento não interrompe os demais da varredura", async () => {
        await configureBaseSchedule({ reminder_enabled: true, reminder_hours: 24 })
        const brokenId = await appointment({ at: new Date(NOW.getTime() + 3 * HOUR_MS) })
        const healthyId = await appointment({ at: new Date(NOW.getTime() + 4 * HOUR_MS) })
        const sendTemplate = vi
            .fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
            .mockImplementation(async () => ({ ok: true, providerMessageId: wamid() }))
        const brokenRepository = {
            ...repository,
            async isStillDue(id: string, appointmentDatetime: Date, now: Date) {
                if (id === String(brokenId)) {
                    throw new Error("falha simulada")
                }
                return repository.isStillDue(id, appointmentDatetime, now)
            },
        }

        const sent = await newSweep({ sendTemplate }, brokenRepository)()

        expect(sent).toBe(1)
        expect(await eventsOf(brokenId)).toEqual([])
        expect((await eventsOf(healthyId)).map((e) => e.type)).toEqual(["REMINDER_SENT"])
    })

    it("grava um lembrete sem documentos com a frase de documento oficial com foto", async () => {
        await configureBaseSchedule({ reminder_enabled: true, reminder_hours: 24 })
        await appointment({
            at: new Date(NOW.getTime() + 3 * HOUR_MS),
            documentsSent: { group: [], question: [] },
        })
        const sendTemplate = vi
            .fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()
            .mockImplementation(async () => ({ ok: true, providerMessageId: wamid() }))

        await newSweep({ sendTemplate })()

        const body = renderizarModelo(
            CORPO_LEMBRETE_ATENDIMENTO,
            sendTemplate.mock.calls[0]?.[0]?.bodyParameters ?? [],
        )
        expect(body).toContain("Traga: um documento oficial com foto.")
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
        const afterAt = new Date(NOW.getTime() + 3 * HOUR_MS)
        const beforeAt = new Date(NOW.getTime() + 4 * HOUR_MS)
        const afterId = await appointment({ at: afterAt, status: "PENDING" })
        const beforeId = await appointment({ at: beforeAt, status: "CONFIRMED" })
        const wamidAfter = wamid()
        const wamidBefore = wamid()
        const failedAt = new Date(NOW.getTime() + 5_000)

        await outboundMessageRepository.applyStatuses(
            [{ providerMessageId: wamidBefore, status: "FAILED", statusAt: NOW, errorCode: "131026" }],
            NOW,
        )
        await repository.recordReminderOutcome(String(afterId), "SENT", NOW, afterAt, wamidAfter)
        await repository.recordReminderOutcome(String(beforeId), "SENT", NOW, beforeAt, wamidBefore)
        await outboundMessageRepository.applyStatuses(
            [{ providerMessageId: wamidAfter, status: "FAILED", statusAt: failedAt, errorCode: "131047" }],
            failedAt,
        )

        expect(await eventsOf(afterId)).toEqual([
            {
                type: "REMINDER_SENT",
                actor_user_id: null,
                data: { appointmentDatetime: afterAt.toISOString() },
                created_at: NOW,
            },
            {
                type: "CITIZEN_NOTIFICATION_FAILED",
                actor_user_id: null,
                data: { kind: "REMINDER", errorCode: "131047" },
                created_at: failedAt,
            },
        ])
        expect(await eventsOf(beforeId)).toEqual([
            {
                type: "REMINDER_SENT",
                actor_user_id: null,
                data: { appointmentDatetime: beforeAt.toISOString() },
                created_at: NOW,
            },
            {
                type: "CITIZEN_NOTIFICATION_FAILED",
                actor_user_id: null,
                data: { kind: "REMINDER", appointmentDatetime: beforeAt.toISOString(), errorCode: "131026" },
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
