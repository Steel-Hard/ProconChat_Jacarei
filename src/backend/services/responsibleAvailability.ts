import type { Permission } from "../types/auth.types"
import type { BusyAppointment, RuleAccount } from "../types/userAccount.types"

const MANAGE_APPOINTMENTS: Permission = "appointments.manage"

export type ResponsibleCandidate = RuleAccount

export type ResponsibleConflict = { reason: "UNAVAILABLE" } | { reason: "BUSY"; appointmentId: string; protocol: string }

export interface ResponsibleConflictInput {
    candidate: ResponsibleCandidate
    appointmentId: string
    appointmentDatetime: Date
    slotMinutes: number | null
    busy: BusyAppointment[]
}

export interface FreeStaffInput {
    eligible: ResponsibleCandidate[]
    appointmentDatetime: Date
    slotMinutes: number | null
    busy: BusyAppointment[]
}

export function isValidResponsible(account: Pick<RuleAccount, "active" | "isAdmin" | "permissions">): boolean {
    return account.active && (account.isAdmin || account.permissions.includes(MANAGE_APPOINTMENTS))
}

function overlaps(a: Date, b: Date, slotMinutes: number | null): boolean {
    if (slotMinutes === null) {
        return a.getTime() === b.getTime()
    }
    const duration = slotMinutes * 60_000
    return a.getTime() < b.getTime() + duration && b.getTime() < a.getTime() + duration
}

function conflictOf(
    candidate: ResponsibleCandidate,
    appointmentId: string | null,
    appointmentDatetime: Date,
    slotMinutes: number | null,
    busy: BusyAppointment[],
): ResponsibleConflict | null {
    if (!isValidResponsible(candidate)) {
        return { reason: "UNAVAILABLE" }
    }
    const clash = busy.find(
        (other) =>
            other.assignedUserId === candidate.id &&
            other.appointmentId !== appointmentId &&
            overlaps(other.appointmentDatetime, appointmentDatetime, slotMinutes),
    )
    return clash ? { reason: "BUSY", appointmentId: clash.appointmentId, protocol: clash.protocol } : null
}

export function findResponsibleConflict(input: ResponsibleConflictInput): ResponsibleConflict | null {
    return conflictOf(input.candidate, input.appointmentId, input.appointmentDatetime, input.slotMinutes, input.busy)
}

export function countFreeStaff(input: FreeStaffInput): number {
    return input.eligible.filter(
        (candidate) => conflictOf(candidate, null, input.appointmentDatetime, input.slotMinutes, input.busy) === null,
    ).length
}
