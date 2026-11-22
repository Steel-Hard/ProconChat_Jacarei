import ConflictError from "../../errors/ConflictError"
import ScheduleNotConfiguredError from "../../errors/ScheduleNotConfiguredError"
import { appointmentsInScheduleInterval, detectScheduleConflicts } from "../../services/scheduleRules"
import {
    BlockedDate,
    BookAppointmentInput,
    BookAppointmentResult,
    CitizenCancelInput,
    CitizenCancelResult,
    CitizenRescheduleInput,
    CitizenRescheduleResult,
    FutureActiveAppointment,
    ReturningAppointment,
    ScheduleConfigView,
    ScheduleConflictItem,
    ScheduleConflictResolution,
    ScheduleRange,
    ScheduleSettings,
    NormalizedScheduleConfig,
    ScheduleVersion,
} from "../../types/schedule.types"
import {
    DeleteScheduledConfigRepoOptions,
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

export interface ScheduleVersionsCall {
    fromDate: string
    toDate: string
}

export type ScheduledSaveCall = SaveScheduleConfigRepoParams & { effectiveFrom: string }

export interface ScheduledDeleteCall {
    effectiveFrom: string
    now: Date
    options?: DeleteScheduledConfigRepoOptions
}

export const DEFAULT_STUB_NOW = new Date("2026-10-05T09:00:00-03:00")

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
    setReturningAppointment(returning: ReturningAppointment | null): void
    returningCalls: { phoneHash: string; now?: Date }[]
    citizenCancelCalls: CitizenCancelInput[]
    setRescheduleResult(result: CitizenRescheduleResult): void
    citizenRescheduleCalls: CitizenRescheduleInput[]
    setScheduledSaveError(error: Error | null): void
    setScheduledDeleteError(error: Error | null): void
    setCancellationNoticeEnabled(enabled: boolean): void
    setCancellationNoticeReadError(error: Error | null): void
    listFutureCalls: Date[]
    versionCalls: ScheduleVersionsCall[]
    configForDateCalls: string[]
    scheduledSaveCalls: ScheduledSaveCall[]
    scheduledDeleteCalls: ScheduledDeleteCall[]
} {
    let currentConfig: ScheduleConfigView | null =
        options.config === undefined
            ? buildDefaultScheduleConfigView()
            : options.config
    const scheduledConfigs = new Map(
        (options.scheduledConfigs ?? []).map((version) => [version.effectiveFrom!, version.config]),
    )
    let appointments: StoredStubAppointment[] = [...(options.appointments ?? [])]
    let scheduledSaveError: Error | null = null
    let scheduledDeleteError: Error | null = null
    let cancellationNoticeEnabled = true
    let cancellationNoticeReadError: Error | null = null
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

    let returningAppointment: ReturningAppointment | null = null
    const returningCalls: { phoneHash: string; now?: Date }[] = []

    async function findReturningAppointment(phoneHash: string, now?: Date): Promise<ReturningAppointment | null> {
        returningCalls.push({ phoneHash, now })
        return returningAppointment
    }

    const citizenCancelCalls: CitizenCancelInput[] = []

    async function cancelByCitizen(input: CitizenCancelInput): Promise<CitizenCancelResult> {
        citizenCancelCalls.push(input)
        return { protocol: "STUB0000" }
    }

    const citizenRescheduleCalls: CitizenRescheduleInput[] = []
    let rescheduleResult: CitizenRescheduleResult | null = null

    async function rescheduleByCitizen(input: CitizenRescheduleInput): Promise<CitizenRescheduleResult> {
        citizenRescheduleCalls.push(input)
        if (!rescheduleResult) {
            throw new Error("Resultado da remarcação não configurado no stub")
        }
        return rescheduleResult
    }

    async function getConfig(): Promise<ScheduleConfigView | null> {
        return currentConfig ? copyConfig(currentConfig) : null
    }

    function copyConfig(config: ScheduleConfigView): ScheduleConfigView {
        return {
            ...config,
            ranges: config.ranges.map((r) => ({ ...r })),
            blockedDates: config.blockedDates.map((b) => ({ ...b })),
            updatedBy: config.updatedBy ? { ...config.updatedBy } : null,
        }
    }

    const configForDateCalls: string[] = []

    async function getConfigForDate(date: string): Promise<ScheduleVersion | null> {
        configForDateCalls.push(date)
        return currentConfig ? { effectiveFrom: null, config: copyConfig(currentConfig) } : null
    }

    const versionCalls: ScheduleVersionsCall[] = []

    function configuredVersions(): ScheduleVersion[] {
        const base: ScheduleVersion[] = currentConfig
            ? [{ effectiveFrom: null, config: copyConfig(currentConfig) }]
            : []
        return base.concat(
            [...scheduledConfigs.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([effectiveFrom, config]) => ({ effectiveFrom, config: copyConfig(config) })),
        )
    }

    async function getScheduleVersions(fromDate: string, toDate: string): Promise<ScheduleVersion[]> {
        versionCalls.push({ fromDate, toDate })
        return configuredVersions()
    }

    async function listScheduledConfigs(fromDate: string): Promise<ScheduleVersion[]> {
        return [...scheduledConfigs.entries()]
            .filter(([effectiveFrom]) => effectiveFrom > fromDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([effectiveFrom, config]) => ({ effectiveFrom, config: copyConfig(config) }))
    }

    interface ConflictResolutionRequest {
        conflictResolution?: ScheduleConflictResolution
        seenConflictIds?: string[]
        seenNoticeEnabled?: boolean
    }

    function futureAppointments(now: Date): FutureActiveAppointment[] {
        return appointments
            .filter((a) => a.appointmentDatetime > now)
            .map((a) => ({
                ...a,
                assignedUserId: a.assignedUserId ?? null,
                offGrid: a.offGrid ?? false,
            }))
    }

    function failWhenNoticeUnreadable(): void {
        if (cancellationNoticeReadError) {
            throw cancellationNoticeReadError
        }
    }

    function conflictDetails(conflicts: ScheduleConflictItem[]): Record<string, unknown> {
        return {
            conflicts,
            cancellationNotice: { enabled: cancellationNoticeEnabled, problem: null },
        }
    }

    function changesSinceSeen(
        conflicts: ScheduleConflictItem[],
        request: ConflictResolutionRequest,
    ): string[] {
        const changes: string[] = []
        if (request.seenConflictIds !== undefined) {
            const seen = new Set(request.seenConflictIds)
            const current = new Set(conflicts.map((conflict) => conflict.id))
            const sameList = seen.size === current.size && [...current].every((id) => seen.has(id))
            if (!sameList) {
                changes.push("CONFLICTS")
            }
        }
        if (
            request.conflictResolution === "CANCEL" &&
            request.seenNoticeEnabled !== undefined &&
            request.seenNoticeEnabled !== cancellationNoticeEnabled
        ) {
            changes.push("NOTICE")
        }
        return changes
    }

    function resolveConflicts(
        conflicts: ScheduleConflictItem[],
        request: ConflictResolutionRequest,
        message: string,
    ): string[] {
        failWhenNoticeUnreadable()
        if (conflicts.length === 0) {
            return []
        }
        if (!request.conflictResolution) {
            throw new ConflictError(message, "SCHEDULE_CONFLICTS", conflictDetails(conflicts))
        }
        const changes = changesSinceSeen(conflicts, request)
        if (changes.length > 0) {
            throw new ConflictError(message, "SCHEDULE_CONFLICTS_CHANGED", {
                ...conflictDetails(conflicts),
                changes,
            })
        }
        const resolvedIds = conflicts.map((conflict) => conflict.id)
        const idSet = new Set(resolvedIds)
        if (request.conflictResolution === "KEEP") {
            appointments = appointments.map((a) => (idSet.has(a.id) ? { ...a, offGrid: true } : a))
        } else {
            appointments = appointments.filter((a) => !idSet.has(a.id))
        }
        return resolvedIds
    }

    function versionBefore(effectiveFrom: string): ScheduleVersion | undefined {
        return configuredVersions()
            .filter((version) => version.effectiveFrom === null || version.effectiveFrom < effectiveFrom)
            .at(-1)
    }

    function nextVersionDate(effectiveFrom: string): string | null {
        return (
            [...scheduledConfigs.keys()]
                .filter((date) => date > effectiveFrom)
                .sort((a, b) => a.localeCompare(b))[0] ?? null
        )
    }

    function appointmentsInVigency(effectiveFrom: string, now: Date): FutureActiveAppointment[] {
        return appointmentsInScheduleInterval(
            futureAppointments(now),
            effectiveFrom,
            nextVersionDate(effectiveFrom),
        )
    }

    async function saveConfig({
        config,
        actorUserId,
        now,
        validateAgainstVersions,
        conflictResolution,
        seenConflictIds,
        seenNoticeEnabled,
        onResolved,
    }: SaveScheduleConfigRepoParams): Promise<ScheduleConfigView> {
        validateAgainstVersions?.(configuredVersions())
        const conflicts = detectScheduleConflicts(config, futureAppointments(now), currentConfig?.slotMinutes ?? null)
        const resolvedIds = resolveConflicts(
            conflicts,
            { conflictResolution, seenConflictIds, seenNoticeEnabled },
            "Esta alteração afeta agendamentos futuros",
        )

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

        onResolved?.({ affectedIds: resolvedIds, noticeEnabled: cancellationNoticeEnabled })
        return copyConfig(currentConfig)
    }

    const scheduledSaveCalls: ScheduledSaveCall[] = []

    async function saveScheduledConfig(params: ScheduledSaveCall): Promise<ScheduleConfigView> {
        scheduledSaveCalls.push(params)
        if (scheduledSaveError) {
            throw scheduledSaveError
        }
        params.validateAgainstVersions?.(configuredVersions())
        const { config, actorUserId, now, effectiveFrom, onResolved } = params
        const previous = versionBefore(effectiveFrom)
        const conflicts = detectScheduleConflicts(
            config,
            appointmentsInVigency(effectiveFrom, now),
            previous?.config.slotMinutes ?? null,
        )
        const resolvedIds = resolveConflicts(
            conflicts,
            params,
            "Esta alteração afeta agendamentos futuros",
        )
        onResolved?.({ affectedIds: resolvedIds, noticeEnabled: cancellationNoticeEnabled })
        return buildDefaultScheduleConfigView({
            ...config,
            effectiveFrom,
            updatedBy: { id: actorUserId, name: users.get(actorUserId) ?? "Usuário" },
            updatedAt: now.toISOString(),
        })
    }

    const scheduledDeleteCalls: ScheduledDeleteCall[] = []

    async function deleteScheduledConfig(
        effectiveFrom: string,
        now: Date,
        deleteOptions?: DeleteScheduledConfigRepoOptions,
    ): Promise<void> {
        scheduledDeleteCalls.push(
            deleteOptions ? { effectiveFrom, now, options: deleteOptions } : { effectiveFrom, now },
        )
        if (scheduledDeleteError) {
            throw scheduledDeleteError
        }
        const previous = versionBefore(effectiveFrom)
        const conflicts = previous
            ? detectScheduleConflicts(
                  previous.config as NormalizedScheduleConfig,
                  appointmentsInVigency(effectiveFrom, now),
                  previous.config.slotMinutes,
              )
            : []
        const resolvedIds = resolveConflicts(
            conflicts,
            deleteOptions ?? {},
            "O cancelamento afeta agendamentos futuros",
        )
        deleteOptions?.onResolved?.({
            affectedIds: resolvedIds,
            noticeEnabled: cancellationNoticeEnabled,
        })
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
        findReturningAppointment,
        returningCalls,
        cancelByCitizen,
        citizenCancelCalls,
        rescheduleByCitizen,
        citizenRescheduleCalls,
        setRescheduleResult(result: CitizenRescheduleResult) {
            rescheduleResult = result
        },
        setReturningAppointment(returning: ReturningAppointment | null) {
            returningAppointment = returning
        },
        versionCalls,
        configForDateCalls,
        scheduledSaveCalls,
        scheduledDeleteCalls,
        setScheduledSaveError(error: Error | null) {
            scheduledSaveError = error
        },
        setScheduledDeleteError(error: Error | null) {
            scheduledDeleteError = error
        },
        setCancellationNoticeEnabled(enabled: boolean) {
            cancellationNoticeEnabled = enabled
        },
        setCancellationNoticeReadError(error: Error | null) {
            cancellationNoticeReadError = error
        },
        setConfig(config: ScheduleConfigView | null) {
            currentConfig = config
        },
        setAppointments(next: StoredStubAppointment[]) {
            appointments = [...next]
        },
    }
}
