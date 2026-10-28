import ConflictError from "../../errors/ConflictError"
import BadRequestError from "../../errors/BadRequestError"
import NotFoundError from "../../errors/NotFoundError"
import ScheduleNotConfiguredError from "../../errors/ScheduleNotConfiguredError"
import { detectScheduleConflicts } from "../../services/scheduleRules"
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
import { getLocalParts } from "../../utils/date.utils"
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
}

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
} {
    let currentConfig: ScheduleConfigView | null =
        options.config === undefined
            ? buildDefaultScheduleConfigView()
            : options.config
    const scheduledConfigs = new Map(
        (options.scheduledConfigs ?? []).map((version) => [version.effectiveFrom!, version.config]),
    )
    let appointments: StoredStubAppointment[] = [...(options.appointments ?? [])]
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
        const today = getLocalParts(new Date()).dateStr
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

    async function getScheduleVersions(fromDate: string, toDate: string): Promise<ScheduleVersion[]> {
        const prior = [...scheduledConfigs.keys()]
            .filter((key) => key <= fromDate)
            .sort()
            .at(-1)
        const versions: ScheduleVersion[] = []
        if (prior) {
            versions.push({ effectiveFrom: prior, config: copyConfig(scheduledConfigs.get(prior)!) })
        } else if (currentConfig) {
            versions.push({ effectiveFrom: null, config: copyConfig(currentConfig) })
        }
        for (const [effectiveFrom, config] of [...scheduledConfigs.entries()].sort(([a], [b]) => a.localeCompare(b))) {
            if (effectiveFrom > fromDate && effectiveFrom <= toDate) {
                versions.push({ effectiveFrom, config: copyConfig(config) })
            }
        }
        return versions
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

        return (await getConfig())!
    }

    async function saveScheduledConfig({ config, actorUserId, now, effectiveFrom }: SaveScheduleConfigRepoParams & { effectiveFrom: string }): Promise<ScheduleConfigView> {
        if (effectiveFrom <= getLocalParts(now).dateStr) {
            throw new BadRequestError("A data de início da mudança deve ser futura")
        }
        const nextDate = [...scheduledConfigs.keys()].filter((date) => date > effectiveFrom).sort()[0] ?? null
        const affected = appointments
            .filter((appointment) => {
                const date = getLocalParts(appointment.appointmentDatetime).dateStr
                return date >= effectiveFrom && (nextDate === null || date < nextDate)
            })
            .map((appointment) => ({ ...appointment, assignedUserId: appointment.assignedUserId ?? null, offGrid: appointment.offGrid ?? false }))
        const previous = await getConfigForDate(
            new Date(new Date(`${effectiveFrom}T12:00:00`).getTime() - 86400000).toISOString().slice(0, 10),
        )
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
        const nextDate = [...scheduledConfigs.keys()].filter((date) => date > effectiveFrom).sort()[0] ?? null
        const previous = await getConfigForDate(
            new Date(new Date(`${effectiveFrom}T12:00:00`).getTime() - 86400000).toISOString().slice(0, 10),
        )
        const affected = appointments
            .filter((appointment) => {
                const date = getLocalParts(appointment.appointmentDatetime).dateStr
                return date >= effectiveFrom && (nextDate === null || date < nextDate)
            })
            .map((appointment) => ({ ...appointment, assignedUserId: appointment.assignedUserId ?? null, offGrid: appointment.offGrid ?? false }))
        const conflicts = previous
            ? detectScheduleConflicts(previous.config as never, affected, previous.config.slotMinutes)
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
        setConfig(config: ScheduleConfigView | null) {
            currentConfig = config
        },
        setAppointments(next: StoredStubAppointment[]) {
            appointments = [...next]
        },
    }
}
