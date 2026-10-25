import ConflictError from "../../errors/ConflictError"
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
} from "../../types/schedule.types"
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
        if (!currentConfig) {
            return null
        }
        return {
            ...currentConfig,
            ranges: currentConfig.ranges.map((r) => ({ ...r })),
            blockedDates: currentConfig.blockedDates.map((b) => ({ ...b })),
            updatedBy: currentConfig.updatedBy ? { ...currentConfig.updatedBy } : null,
        }
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

    return {
        getSettings,
        getRanges,
        getBlockedDates,
        countActiveAppointmentsPerSlot,
        bookAppointment,
        getConfig,
        saveConfig,
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
