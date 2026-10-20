import type AppError from "../errors/AppError"
import type { AppointmentStatus } from "./appointment.types"
import type { Permission } from "./auth.types"

export interface UserAccountUpdater {
    id: number
    name: string
}

export interface UserAccount {
    id: number
    name: string
    email: string
    isAdmin: boolean
    active: boolean
    permissions: Permission[]
    lastLoginAt: string | null
    permissionsUpdatedAt: string | null
    permissionsUpdatedBy: UserAccountUpdater | null
}

export interface UserAccountLastChange {
    name: string
    at: string
}

export interface UserAccountList {
    items: UserAccount[]
    lastChange: UserAccountLastChange | null
}

export interface AccountBatchResult extends UserAccountList {
    redistributed: number
}

export type Reassignment = { mode: "pending" } | { mode: "assign"; toUserId: number }

export type ReassignmentReason = "USER_DEACTIVATED" | "MANAGE_PERMISSION_REMOVED"

export interface AccountChange {
    userId: number
    permissions?: Permission[]
    active?: boolean
    reassignment?: Reassignment
}

export interface AccountBatchRequest {
    changes: AccountChange[]
}

export interface FutureAppointment {
    id: string
    protocol: string
    name: string
    appointmentDatetime: string
    status: AppointmentStatus
}

export interface CreateAccountInput {
    name: string
    email: string
    password: string
}

export interface AccountRequester {
    id: number
    isAdmin: boolean
    permissions: Permission[]
}

export interface RuleAccount {
    id: number
    isAdmin: boolean
    active: boolean
    permissions: Permission[]
}

export interface ReassignableAppointment {
    appointmentId: string
    protocol: string
    appointmentDatetime: Date
}

export interface LockedAccount extends RuleAccount {
    futureAppointments: ReassignableAppointment[]
}

export interface BusyAppointment {
    appointmentId: string
    protocol: string
    assignedUserId: number
    appointmentDatetime: Date
}

export interface AccountBatchState {
    requester: AccountRequester
    changes: AccountChange[]
    accounts: LockedAccount[]
    targets: RuleAccount[]
    slotMinutes: number | null
    busy: BusyAppointment[]
}

export type PlannedReassignment =
    | { mode: "pending"; reason: ReassignmentReason; appointments: ReassignableAppointment[] }
    | { mode: "assign"; reason: ReassignmentReason; toUserId: number; appointments: ReassignableAppointment[] }

export interface AccountPlan {
    userId: number
    grant: Permission[]
    revoke: Permission[]
    active: boolean | null
    bumpSessionVersion: boolean
    recordUpdate: boolean
    reassignment: PlannedReassignment | null
}

export type AccountBatchDecision = { allowed: true; plans: AccountPlan[] } | { allowed: false; error: AppError }

export type DecideAccountBatch = (state: AccountBatchState) => AccountBatchDecision

export interface PasswordResetState {
    requester: AccountRequester
    userId: number
    account: RuleAccount | null
}

export type PasswordResetDecision = { allowed: true } | { allowed: false; error: AppError }

export type DecidePasswordReset = (state: PasswordResetState) => PasswordResetDecision
