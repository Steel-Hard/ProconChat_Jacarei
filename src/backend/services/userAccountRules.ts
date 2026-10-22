import AppError from "../errors/AppError"
import ConflictError from "../errors/ConflictError"
import ForbiddenError from "../errors/ForbiddenError"
import NotFoundError from "../errors/NotFoundError"
import { Permission, PERMISSIONS } from "../types/auth.types"
import type {
    AccountBatchDecision,
    AccountBatchState,
    AccountChange,
    AccountPlan,
    AccountRequester,
    BusyAppointment,
    LockedAccount,
    PasswordResetDecision,
    PasswordResetState,
    PlannedReassignment,
    RuleAccount,
} from "../types/userAccount.types"
import { findResponsibleConflict, isValidResponsible } from "./responsibleAvailability"

const VIEW_APPOINTMENTS: Permission = "appointments.view"
const MANAGE_APPOINTMENTS: Permission = "appointments.manage"

interface CheckedItem {
    change: AccountChange
    account: LockedAccount
    finalPermissions: Permission[]
    finalActive: boolean
    grant: Permission[]
    revoke: Permission[]
    changesActive: boolean
}

type Checked<T> = { ok: true; value: T } | { ok: false; error: AppError }

export function normalizePermissions(permissions: Permission[]): Permission[] {
    const wanted = new Set(permissions)
    if (wanted.has(MANAGE_APPOINTMENTS)) {
        wanted.add(VIEW_APPOINTMENTS)
    }
    return PERMISSIONS.filter((permission) => wanted.has(permission))
}

function holds(requester: AccountRequester, permission: Permission): boolean {
    return requester.isAdmin || requester.permissions.includes(permission)
}

function hasMoreThan(account: RuleAccount, requester: AccountRequester): boolean {
    return account.permissions.some((permission) => !holds(requester, permission))
}

function lockedAccountError(
    account: RuleAccount,
    requester: AccountRequester,
    details?: Record<string, unknown>,
): AppError | null {
    if (account.isAdmin) {
        return new ForbiddenError("A conta do Admin não pode ser alterada por aqui", "ADMIN_ACCOUNT_LOCKED", details)
    }
    if (account.id === requester.id) {
        return new ForbiddenError("A própria conta não pode ser alterada por aqui", "SELF_ACCOUNT_LOCKED", details)
    }
    return null
}

function targetHasMorePermissionsError(details?: Record<string, unknown>): AppError {
    return new ForbiddenError(
        "A conta tem permissões que você não tem",
        "TARGET_HAS_MORE_PERMISSIONS",
        details,
    )
}

function checkItem(
    change: AccountChange,
    account: LockedAccount | undefined,
    requester: AccountRequester,
): Checked<CheckedItem> {
    const details = { userId: change.userId }
    if (!account) {
        return { ok: false, error: new NotFoundError("Conta não encontrada", details) }
    }
    const locked = lockedAccountError(account, requester, details)
    if (locked) {
        return { ok: false, error: locked }
    }
    const changesActive = change.active !== undefined && change.active !== account.active
    if (changesActive && hasMoreThan(account, requester)) {
        return { ok: false, error: targetHasMorePermissionsError(details) }
    }
    const finalPermissions =
        change.permissions === undefined ? account.permissions : normalizePermissions(change.permissions)
    const grant = PERMISSIONS.filter(
        (permission) => finalPermissions.includes(permission) && !account.permissions.includes(permission),
    )
    const revoke = PERMISSIONS.filter(
        (permission) => account.permissions.includes(permission) && !finalPermissions.includes(permission),
    )
    if ([...grant, ...revoke].some((permission) => !holds(requester, permission))) {
        return {
            ok: false,
            error: new ForbiddenError(
                "Você não pode conceder nem remover uma permissão que não tem",
                "PERMISSION_NOT_HELD",
                details,
            ),
        }
    }
    return {
        ok: true,
        value: {
            change,
            account,
            finalPermissions,
            finalActive: change.active ?? account.active,
            grant,
            revoke,
            changesActive,
        },
    }
}

function planReassignment(
    item: CheckedItem,
    finalAccounts: Map<number, RuleAccount>,
    state: AccountBatchState,
    movedTo: Map<number, BusyAppointment[]>,
): Checked<PlannedReassignment | null> {
    const { account, change } = item
    const deactivates = account.active && !item.finalActive
    const losesManage =
        account.permissions.includes(MANAGE_APPOINTMENTS) && !item.finalPermissions.includes(MANAGE_APPOINTMENTS)
    const appointments = account.futureAppointments
    if (!(deactivates || losesManage) || appointments.length === 0) {
        return { ok: true, value: null }
    }

    const reason = deactivates ? "USER_DEACTIVATED" : "MANAGE_PERMISSION_REMOVED"
    const details = { userId: account.id }
    const reassignment = change.reassignment
    if (!reassignment) {
        return {
            ok: false,
            error: new ConflictError(
                "A conta tem agendamentos futuros que precisam de outro destino",
                "REASSIGNMENT_REQUIRED",
                details,
            ),
        }
    }
    if (reassignment.mode === "pending") {
        return { ok: true, value: { mode: "pending", reason, appointments } }
    }

    const toUserId = reassignment.toUserId
    const destination = finalAccounts.get(toUserId)
    if (!destination || toUserId === account.id || !isValidResponsible(destination)) {
        return {
            ok: false,
            error: new ConflictError(
                "O destino dos agendamentos precisa ser outra conta ativa que gerencie agendamentos",
                "INVALID_REASSIGNMENT_TARGET",
                details,
            ),
        }
    }

    const moved = movedTo.get(toUserId) ?? []
    for (const appointment of appointments) {
        const conflict = findResponsibleConflict({
            candidate: destination,
            appointmentId: appointment.appointmentId,
            appointmentDatetime: appointment.appointmentDatetime,
            slotMinutes: state.slotMinutes,
            busy: [...state.busy, ...moved],
        })
        if (conflict?.reason === "BUSY") {
            return {
                ok: false,
                error: new ConflictError(
                    "O destino já tem um agendamento nesse horário",
                    "REASSIGNMENT_TARGET_BUSY",
                    {
                        ...details,
                        toUserId,
                        protocol: appointment.protocol,
                        conflictingProtocol: conflict.protocol,
                    },
                ),
            }
        }
        moved.push({ ...appointment, assignedUserId: toUserId })
    }
    movedTo.set(toUserId, moved)
    return { ok: true, value: { mode: "assign", reason, toUserId, appointments } }
}

export function decideAccountBatch(state: AccountBatchState): AccountBatchDecision {
    const accounts = new Map(state.accounts.map((account) => [account.id, account]))
    const changes = [...state.changes].sort((a, b) => a.userId - b.userId)

    const items: CheckedItem[] = []
    for (const change of changes) {
        const checked = checkItem(change, accounts.get(change.userId), state.requester)
        if (!checked.ok) {
            return { allowed: false, error: checked.error }
        }
        items.push(checked.value)
    }

    const finalAccounts = new Map<number, RuleAccount>(state.targets.map((target) => [target.id, target]))
    for (const item of items) {
        finalAccounts.set(item.account.id, {
            id: item.account.id,
            isAdmin: item.account.isAdmin,
            active: item.finalActive,
            permissions: item.finalPermissions,
        })
    }

    const movedTo = new Map<number, BusyAppointment[]>()
    const plans: AccountPlan[] = []
    for (const item of items) {
        const reassignment = planReassignment(item, finalAccounts, state, movedTo)
        if (!reassignment.ok) {
            return { allowed: false, error: reassignment.error }
        }
        plans.push({
            userId: item.account.id,
            grant: item.grant,
            revoke: item.revoke,
            active: item.changesActive ? item.finalActive : null,
            bumpSessionVersion: item.account.active && !item.finalActive,
            recordUpdate: item.grant.length > 0 || item.revoke.length > 0 || item.changesActive,
            reassignment: reassignment.value,
        })
    }
    return { allowed: true, plans }
}

export function decidePasswordReset({ requester, account }: PasswordResetState): PasswordResetDecision {
    if (!account) {
        return { allowed: false, error: new NotFoundError("Conta não encontrada") }
    }
    const locked = lockedAccountError(account, requester)
    if (locked) {
        return { allowed: false, error: locked }
    }
    if (hasMoreThan(account, requester)) {
        return { allowed: false, error: targetHasMorePermissionsError() }
    }
    return { allowed: true }
}
