import { useTranslation } from "react-i18next"
import PERMISSION_KEYS from "@/navigation/permissionKeys"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionLock from "@/types/users/PermissionLock.types"
import type ReassignmentRequest from "@/types/users/ReassignmentRequest.types"
import type UserAccount from "@/types/users/UserAccount.types"
import type UserAccountPanelView from "@/types/users/UserAccountPanelView.types"
import type UserAccountRowView from "@/types/users/UserAccountRowView.types"
import type UserDraft from "@/types/users/UserDraft.types"
import type UserPermissionItemView from "@/types/users/UserPermissionItemView.types"
import formatDate from "@/utils/formatDate"
import formatDayMonth from "@/utils/formatDayMonth"
import formatTime from "@/utils/formatTime"
import initialsOf from "@/utils/initialsOf"
import accountLocks from "@/utils/users/accountLocks"
import draftChangeList from "@/utils/users/draftChangeList"
import permissionLocks from "@/utils/users/permissionLocks"
import reassignmentTargets from "@/utils/users/reassignmentTargets"

type Options = {
    actor: PanelAccount
    saved: UserAccount[]
    effective: UserAccount[]
    draft: UserDraft
    selected: UserAccount | null
    reassignment: ReassignmentRequest | null
}

function useUserViews({ actor, saved, effective, draft, selected, reassignment }: Options) {
    const { t } = useTranslation(["users", "common"])

    function lastLoginOf(account: UserAccount): string | null {
        if (account.lastLoginAt === null) {
            return t("list.neverLoggedIn")
        }

        const date = formatDate(account.lastLoginAt)

        return date === null
            ? null
            : t("list.lastLogin", { date, time: formatTime(new Date(account.lastLoginAt)) })
    }

    function permissionsChangedOf(account: UserAccount): string | null {
        if (account.permissionsUpdatedBy === null || account.permissionsUpdatedAt === null) {
            return t("account.permissionsNeverChanged")
        }

        const date = formatDate(account.permissionsUpdatedAt)

        return date === null
            ? null
            : t("account.permissionsChanged", { name: account.permissionsUpdatedBy.name, date })
    }

    function rowOf(account: UserAccount): UserAccountRowView {
        const permissions = account.isAdmin
            ? t("list.allPermissions")
            : t("list.permissionCount", {
                  count: account.permissions.length,
                  total: PERMISSION_KEYS.length
              })

        return {
            id: account.id,
            initials: initialsOf(account.name),
            name: account.name,
            isAdmin: account.isAdmin,
            summary: t("list.summary", { email: account.email, permissions }),
            lastLogin: lastLoginOf(account),
            active: account.active,
            statusLabel: account.active ? t("list.active") : t("list.inactive"),
            unsaved: draft[account.id] !== undefined,
            selected: account.id === selected?.id
        }
    }

    function warningOf(lock: PermissionLock): string | null {
        if (lock.reason === "lacks") {
            return t("account.locks.lacks")
        }

        return lock.reason === "cascade" ? t("account.locks.cascade") : null
    }

    function permissionItems(account: UserAccount): UserPermissionItemView[] {
        return permissionLocks(actor, account).map((lock) => ({
            key: lock.key,
            name: t(`permissions.${lock.key}.name`),
            description: t(`permissions.${lock.key}.description`),
            includes: lock.key === "appointments.manage" ? t("account.includesView") : null,
            checked: lock.checked,
            disabled: lock.disabled,
            warning: warningOf(lock)
        }))
    }

    function panelOf(account: UserAccount): UserAccountPanelView {
        const locks = accountLocks(actor, account)
        const blocked = !locks.canManage && (locks.showReset || locks.showToggle)
        const self = account.id === actor.id

        return {
            initials: initialsOf(account.name),
            name: account.name,
            isAdmin: account.isAdmin,
            adminLabel: t("list.admin"),
            email: account.email,
            lastLogin: lastLoginOf(account),
            permissionsChanged: permissionsChangedOf(account),
            resetPassword: locks.showReset
                ? { label: t("actions.resetPassword"), disabled: !locks.canManage }
                : null,
            toggleActive: locks.showToggle
                ? {
                      label: account.active ? t("actions.deactivate") : t("actions.reactivate"),
                      disabled: !locks.canManage
                  }
                : null,
            changeMyPassword: locks.showSelfPassword ? t("actions.changeMyPassword") : null,
            lockWarning: blocked
                ? t(locks.selfLocked ? "account.locks.self" : "account.locks.outranks")
                : null,
            adminNotes: account.isAdmin
                ? [t("account.adminNote"), t("account.adminPasswordNote")]
                : [],
            selfNote: locks.selfLocked ? t("account.selfNote") : null,
            outranksNote: locks.outranks && !self ? t("account.outranksNote") : null,
            permissionsHeading: t("account.permissionsHeading"),
            permissions: permissionItems(account)
        }
    }

    function reassignmentView(request: ReassignmentRequest) {
        const count = request.appointments.length
        const name = saved.find((account) => account.id === request.userId)?.name ?? ""
        const reasonText = t(`dialogs.reassignment.${request.reason}`, { name })

        return {
            key: request.revision,
            texts: {
                title: t("dialogs.reassignment.title", { count }),
                description: `${reasonText} ${t("dialogs.reassignment.choose", { count })}`,
                listLabel: t("dialogs.reassignment.listLabel"),
                optionsLabel: t("dialogs.reassignment.optionsLabel"),
                pending: t("dialogs.reassignment.pending"),
                assign: t("dialogs.reassignment.assign"),
                assignTo: t("dialogs.reassignment.assignTo"),
                noTargets: t("dialogs.reassignment.noTargets"),
                historyNote: t("dialogs.reassignment.historyNote"),
                back: t("dialogs.reassignment.back"),
                confirm: t("dialogs.reassignment.continue")
            },
            appointments: request.appointments.map((appointment) => ({
                id: appointment.id,
                protocol: appointment.protocol,
                name: appointment.name,
                when: t("dialogs.reassignment.when", {
                    date: formatDayMonth(appointment.appointmentDatetime),
                    time: formatTime(new Date(appointment.appointmentDatetime))
                })
            })),
            targets: reassignmentTargets(effective, request.userId).map((account) => ({
                id: account.id,
                name: account.name
            }))
        }
    }

    const changes = draftChangeList(saved, draft, {
        permissionName: (key) => t(`permissions.${key}.name`),
        grant: (name, permission) => t("changes.grant", { name, permission }),
        revoke: (name, permission) => t("changes.revoke", { name, permission }),
        deactivate: (name) => t("changes.deactivate", { name }),
        reactivate: (name) => t("changes.reactivate", { name }),
        redistributed: (count) => t("changes.redistributed", { count })
    })

    return {
        rows: effective.map(rowOf),
        panel: selected === null ? null : panelOf(selected),
        changes,
        reassignment: reassignment === null ? null : reassignmentView(reassignment)
    }
}

export default useUserViews
