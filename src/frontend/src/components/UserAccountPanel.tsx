import { useId } from "react"
import UserPermissionItem from "@/components/UserPermissionItem"
import type PermissionKey from "@/types/account/PermissionKey.types"
import type UserAccountPanelView from "@/types/users/UserAccountPanelView.types"
import css from "@/styles/components/userAccountPanel.module.css"

type UserAccountPanelProps = {
    view: UserAccountPanelView
    onResetPassword: () => void
    onToggleActive: () => void
    onChangeMyPassword: () => void
    onTogglePermission: (key: PermissionKey) => void
    locked?: boolean
}

function UserAccountPanel({
    view,
    onResetPassword,
    onToggleActive,
    onChangeMyPassword,
    onTogglePermission,
    locked = false
}: UserAccountPanelProps) {
    const nameId = useId()
    const warningId = useId()
    const describedBy = (disabled: boolean) =>
        disabled && view.lockWarning ? warningId : undefined
    const hasActions =
        view.resetPassword !== null || view.toggleActive !== null || view.changeMyPassword !== null

    return (
        <section className={css.panel} aria-labelledby={nameId}>
            <div className={css.header}>
                <div className={css.identity}>
                    <span className={css.avatar} aria-hidden="true">
                        {view.initials}
                    </span>
                    <div className={css.details}>
                        <h2 id={nameId} className={css.name}>
                            {view.name}
                            {view.isAdmin ? (
                                <span className={css.admin}>{view.adminLabel}</span>
                            ) : null}
                        </h2>
                        <p className={css.email}>{view.email}</p>
                        {view.lastLogin ? <p className={css.meta}>{view.lastLogin}</p> : null}
                        {view.permissionsChanged ? (
                            <p className={css.meta}>{view.permissionsChanged}</p>
                        ) : null}
                    </div>
                </div>
                {hasActions ? (
                    <div className={css.actions}>
                        {view.resetPassword ? (
                            <button
                                type="button"
                                className={css.secondary}
                                disabled={view.resetPassword.disabled}
                                aria-describedby={describedBy(view.resetPassword.disabled)}
                                onClick={onResetPassword}
                            >
                                {view.resetPassword.label}
                            </button>
                        ) : null}
                        {view.changeMyPassword ? (
                            <button
                                type="button"
                                className={css.secondary}
                                onClick={onChangeMyPassword}
                            >
                                {view.changeMyPassword}
                            </button>
                        ) : null}
                        {view.toggleActive ? (
                            <button
                                type="button"
                                className={css.neutral}
                                disabled={view.toggleActive.disabled || locked}
                                aria-describedby={describedBy(view.toggleActive.disabled)}
                                onClick={onToggleActive}
                            >
                                {view.toggleActive.label}
                            </button>
                        ) : null}
                        {view.lockWarning ? (
                            <p id={warningId} className={css.lockWarning}>
                                {view.lockWarning}
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>
            {view.adminNotes.length > 0 ? (
                <div className={css.note}>
                    {view.adminNotes.map((note) => (
                        <p key={note}>{note}</p>
                    ))}
                </div>
            ) : null}
            {view.outranksNote ? <p className={css.muted}>{view.outranksNote}</p> : null}
            {view.selfNote ? <p className={css.note}>{view.selfNote}</p> : null}
            <div>
                <h3 className={css.heading}>{view.permissionsHeading}</h3>
                {view.permissions.map((item) => (
                    <UserPermissionItem
                        key={item.key}
                        item={locked ? { ...item, disabled: true } : item}
                        onToggle={onTogglePermission}
                    />
                ))}
            </div>
        </section>
    )
}

export default UserAccountPanel
