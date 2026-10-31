import ConflictError from "../../errors/ConflictError"
import BadRequestError from "../../errors/BadRequestError"
import NotFoundError from "../../errors/NotFoundError"
import ScheduleNotConfiguredError from "../../errors/ScheduleNotConfiguredError"
import { appointmentsInScheduleInterval, detectScheduleConflicts } from "../../services/scheduleRules"
import {
    BlockedDate,
    BookAppointmentInput,
    BookAppointmentResult,
    FutureActiveAppointment,
    ScheduleConfigView,
    ScheduleRange,
    ScheduleSettings,
    ScheduleVersion,
} from "../../types/schedule.types"
import { addDaysToDateString, getLocalParts } from "../../utils/date.utils"
import {
    IScheduleRepository,
    SaveScheduleConfigRepoParams,
} from "../schedule.repository.interface"

export interface StoredStubAppointment
    extends Omit<FutureActiveAppointment, "assignedUserId" | "offGrid"> {
    assignedUserId?: number | null
    offGrid?: boolean
}

export interface ScheduleStubOptions {
    config?: ScheduleConfigView | null
    scheduledConfigs?: ScheduleVersion[]
    appointments?: StoredStubAppointment[]
    users?: Map<number, string>
    now?: Date
}

export interface ScheduleVersionsCall {
    fromDate: string
    toDate: string
}

const DEFAULT_STUB_NOW = new Date("2026-10-05T09:00:00-03:00")

export function buildDefaultScheduleConfigView(
    overrides: Partial<ScheduleConfigView> = {},
): ScheduleConfigView {
    return {
        slotMinutes: 30,
        seatsPerSlot: 2,
        windowDays: 30,
        minNoticeDays: 1,
        waitAlertDays: 7,
        unitAddress: "Av. Nove de Julho, 215 - Centro, Jacareí - SP",
        unitAddressComplement: "Sala 2",
        reminderEnabled: true,
        reminderHours: 24,
        ranges: [1, 2, 3, 4, 5].flatMap((weekday) => [
            { weekday, slotIndex: 1, startTime: "08:00", endTime: "12:00" },
            { weekday, slotIndex: 2, startTime: "13:00", endTime: "17:00" },
        ]),
        blockedDates: [],
        updatedBy: { id: 1, name: "Marcos Costa" },
        updatedAt: "2026-10-05T12:00:00.000Z",
        ...overrides,
    }
}

export function createScheduleStubRepository(
    options: ScheduleStubOptions = {},
): IScheduleRepository & {
    setConfig(config: ScheduleConfigView | null): void
    setAppointments(appointments: StoredStubAppointment[]): void
    listFutureCalls: Date[]
    versionCalls: ScheduleVersionsCall[]
} {
    let currentConfig: ScheduleConfigView | null =
        options.config === undefined
            ? buildDefaultScheduleConfigView()
            : options.config
    const scheduledConfigs = new Map(
        (options.scheduledConfigs ?? []).map((version) => [version.effectiveFrom!, version.config]),
    )
    let appointments: StoredStubAppointment[] = [...(options.appointments ?? [])]
    const clockNow = options.now ?? DEFAULT_STUB_NOW
    const users =
        options.users ??
        new Map<number, string>([
            [1, "Marcos Costa"],
            [2, "Patrícia Lima"],
        ])

    async function getSettings(): Promise<ScheduleSettings | null> {
        if (!currentConfig) {
            return null
        }
        return {
            id: 1,
            slot_minutes: currentConfig.slotMinutes,
            seats_per_slot: currentConfig.seatsPerSlot,
            window_days: currentConfig.windowDays,
            min_notice_days: currentConfig.minNoticeDays,
            wait_alert_days: currentConfig.waitAlertDays,
            unit_address: currentConfig.unitAddress,
            unit_address_complement: currentConfig.unitAddressComplement,
            reminder_enabled: currentConfig.reminderEnabled,
            reminder_hours: currentConfig.reminderHours,
            updated_by: currentConfig.updatedBy,
            updated_at: currentConfig.updatedAt
                ? new Date(currentConfig.updatedAt)
                : undefined,
        }
    }

    async function getRanges(): Promise<ScheduleRange[]> {
        if (!currentConfig) {
            return []
        }
        return currentConfig.ranges.map((r, idx) => ({
            id: idx + 1,
            weekday: r.weekday,
            slot_index: r.slotIndex,
            start_time: r.startTime,
            end_time: r.endTime,
        }))
    }

    async function getBlockedDates(
        fromDate: string,
        toDate: string,
    ): Promise<BlockedDate[]> {
        if (!currentConfig) {
            return []
        }
        return currentConfig.blockedDates
            .filter((b) => b.date >= fromDate && b.date <= toDate)
            .map((b, idx) => ({
                id: idx + 1,
                date: b.date,
                start_time: b.startTime,
                end_time: b.endTime,
                description: b.description,
            }))
    }

    async function countActiveAppointmentsPerSlot(
        fromDatetime: Date,
        toDatetime: Date,
    ): Promise<Map<string, number>> {
        const counts = new Map<string, number>()
        for (const a of appointments) {
            if (
                a.appointmentDatetime >= fromDatetime &&
                a.appointmentDatetime <= toDatetime
            ) {
                const iso = a.appointmentDatetime.toISOString()
                counts.set(iso, (counts.get(iso) ?? 0) + 1)
            }
        }
        return counts
    }

    async function bookAppointment(
        input: BookAppointmentInput,
    ): Promise<BookAppointmentResult> {
        if (!currentConfig) {
            throw new ScheduleNotConfiguredError()
        }
        return {
            id: "1",
            appointmentCode: "a1b2c3d4-0000-0000-0000-000000000000",
            protocol: "A1B2C3D4",
            appointmentDatetime: input.appointmentDatetime,
            unitAddress: currentConfig.unitAddress,
            unitAddressComplement: currentConfig.unitAddressComplement,
            documentsSent: { group: [], question: [] },
            reminderEnabled: currentConfig.reminderEnabled,
            reminderHours: currentConfig.reminderHours,
        }
    }

    const listFutureCalls: Date[] = []

    async function listFutureActiveAppointments(now: Date): Promise<FutureActiveAppointment[]> {
        listFutureCalls.push(now)
        return appointments.map((a) => ({
            ...a,
            assignedUserId: a.assignedUserId ?? null,
            offGrid: a.offGrid ?? false,
        }))
    }

    async function getConfig(): Promise<ScheduleConfigView | null> {
        const today = getLocalParts(clockNow).dateStr
        return (await getConfigForDate(today))?.config ?? null
    }

    function copyConfig(config: ScheduleConfigView): ScheduleConfigView {
        return {
            ...config,
            ranges: config.ranges.map((r) => ({ ...r })),
            blockedDates: config.blockedDates.map((b) => ({ ...b })),
            updatedBy: config.updatedBy ? { ...config.updatedBy } : null,
        }
    }

    async function getConfigForDate(date: string): Promise<ScheduleVersion | null> {
        const effectiveFrom = [...scheduledConfigs.keys()]
            .filter((key) => key <= date)
            .sort()
            .at(-1)
        const config = effectiveFrom ? scheduledConfigs.get(effectiveFrom) : currentConfig
        return config
            ? { effectiveFrom: effectiveFrom ?? null, config: copyConfig(config) }
            : null
    }

    const versionCalls: ScheduleVersionsCall[] = []

    async function getScheduleVersions(fromDate: string, toDate: string): Promise<ScheduleVersion[]> {
        versionCalls.push({ fromDate, toDate })
        const base: ScheduleVersion[] = currentConfig
            ? [{ effectiveFrom: null, config: copyConfig(currentConfig) }]
            : []
        return base.concat(
            [...scheduledConfigs.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([effectiveFrom, config]) => ({ effectiveFrom, config: copyConfig(config) })),
        )
    }

    async function listScheduledConfigs(fromDate: string): Promise<ScheduleVersion[]> {
        return [...scheduledConfigs.entries()]
            .filter(([effectiveFrom]) => effectiveFrom > fromDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([effectiveFrom, config]) => ({ effectiveFrom, config: copyConfig(config) }))
    }

    async function saveConfig({
        config,
        actorUserId,
        now,
    }: SaveScheduleConfigRepoParams): Promise<ScheduleConfigView> {
        const future: FutureActiveAppointment[] = appointments
            .filter((a) => a.appointmentDatetime > now)
            .map((a) => ({
                ...a,
                assignedUserId: a.assignedUserId ?? null,
                offGrid: a.offGrid ?? false,
            }))
        const conflicts = detectScheduleConflicts(
            config,
            future,
            currentConfig?.slotMinutes ?? null,
        )
        if (conflicts.length > 0) {
            throw new ConflictError(
                "Esta alteração afeta agendamentos futuros",
                "SCHEDULE_CONFLICTS",
                { conflicts },
            )
        }

        const actorName = users.get(actorUserId) ?? "Usuário"
        currentConfig = {
            slotMinutes: config.slotMinutes,
            seatsPerSlot: config.seatsPerSlot,
            windowDays: config.windowDays,
            minNoticeDays: config.minNoticeDays,
            waitAlertDays: config.waitAlertDays,
            unitAddress: config.unitAddress,
            unitAddressComplement: config.unitAddressComplement,
            reminderEnabled: config.reminderEnabled,
            reminderHours: config.reminderHours,
            ranges: config.ranges.map((r) => ({ ...r })),
            blockedDates: config.blockedDates.map((b) => ({ ...b })),
            updatedBy: { id: actorUserId, name: actorName },
            updatedAt: now.toISOString(),
        }

        return (await getConfigForDate(getLocalParts(now).dateStr))!.config
    }

    function nextChangeAfter(effectiveFrom: string): string | null {
        return [...scheduledConfigs.keys()].filter((date) => date > effectiveFrom).sort()[0] ?? null
    }

    function futureOf(): FutureActiveAppointment[] {
        return appointments.map((appointment) => ({
            ...appointment,
            assignedUserId: appointment.assignedUserId ?? null,
            offGrid: appointment.offGrid ?? false,
        }))
    }

    async function saveScheduledConfig({ config, actorUserId, now, effectiveFrom }: SaveScheduleConfigRepoParams & { effectiveFrom: string }): Promise<ScheduleConfigView> {
        if (effectiveFrom <= getLocalParts(now).dateStr) {
            throw new BadRequestError("A data de início da mudança deve ser futura")
        }
        const nextDate = nextChangeAfter(effectiveFrom)
        const affected = appointmentsInScheduleInterval(futureOf(), effectiveFrom, nextDate)
        const previous = await getConfigForDate(addDaysToDateString(effectiveFrom, -1))
        const conflicts = detectScheduleConflicts(config, affected, previous?.config.slotMinutes ?? null)
        if (conflicts.length > 0) {
            throw new ConflictError("Esta alteração afeta agendamentos futuros", "SCHEDULE_CONFLICTS", { conflicts })
        }
        const actorName = users.get(actorUserId) ?? "Usuário"
        const saved = buildDefaultScheduleConfigView({
            ...config,
            effectiveFrom,
            updatedBy: { id: actorUserId, name: actorName },
            updatedAt: now.toISOString(),
        })
        scheduledConfigs.set(effectiveFrom, saved)
        return copyConfig(saved)
    }

    async function deleteScheduledConfig(effectiveFrom: string, now: Date): Promise<void> {
        if (effectiveFrom <= getLocalParts(now).dateStr) {
            throw new BadRequestError("Não é possível cancelar uma mudança que já começou")
        }
        if (!scheduledConfigs.has(effectiveFrom)) {
            throw new NotFoundError("Mudança de horário não encontrada")
        }
        const nextDate = nextChangeAfter(effectiveFrom)
        const previous = await getConfigForDate(addDaysToDateString(effectiveFrom, -1))
        const affected = appointmentsInScheduleInterval(futureOf(), effectiveFrom, nextDate)
        const conflicts = previous
            ? detectScheduleConflicts(previous.config, affected, previous.config.slotMinutes)
            : []
        if (conflicts.length > 0) {
            throw new ConflictError("O cancelamento afeta agendamentos futuros", "SCHEDULE_CONFLICTS", { conflicts })
        }
        scheduledConfigs.delete(effectiveFrom)
    }

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
        listFutureCalls,
        versionCalls,
        setConfig(config: ScheduleConfigView | null) {
            currentConfig = config
        },
        setAppointments(next: StoredStubAppointment[]) {
            appointments = [...next]
        },
    }
}
