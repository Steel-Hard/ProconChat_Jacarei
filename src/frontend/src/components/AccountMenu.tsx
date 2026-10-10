import { useEffect, useId, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import useShowAccountEmail from "@/hooks/useShowAccountEmail"
import type PanelAccount from "@/types/account/PanelAccount.types"
import css from "@/styles/components/accountMenu.module.css"
import initialsOf from "@/utils/initialsOf"

type AccountMenuProps = {
    account: PanelAccount
    onChangePassword?: () => void
    onLogout?: () => void
}

function AccountMenu({ account, onChangePassword, onLogout }: AccountMenuProps) {
    const { t } = useTranslation()
    const menuId = useId()
    const [open, setOpen] = useState(false)
    const container = useRef<HTMLDivElement>(null)
    const trigger = useRef<HTMLButtonElement>(null)
    const showEmail = useShowAccountEmail()
    const hasOptions = onChangePassword !== undefined || onLogout !== undefined

    useEffect(() => {
        if (!open) {
            return
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false)
                trigger.current?.focus()
            }
        }

        function handlePointerDown(event: MouseEvent) {
            if (container.current && !container.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("mousedown", handlePointerDown)

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("mousedown", handlePointerDown)
        }
    }, [open])

    function choose(action: () => void) {
        setOpen(false)
        action()
    }

    return (
        <div ref={container} className={css.account}>
            <span className={css.avatar} aria-hidden="true">
                {initialsOf(account.name)}
            </span>
            <span className={css.identity}>
                <span className={css.name}>
                    {account.isAdmin ? (
                        <Trans
                            t={t}
                            i18nKey="accountMenu.nameWithAdmin"
                            values={{ name: account.name }}
                            components={{ badge: <span className={css.admin} /> }}
                        />
                    ) : (
                        account.name
                    )}
                </span>
                {showEmail ? <span className={css.email}>{account.email}</span> : null}
            </span>
            {hasOptions ? (
                <button
                    ref={trigger}
                    type="button"
                    className={css.trigger}
                    aria-expanded={open}
                    aria-controls={open ? menuId : undefined}
                    onClick={() => setOpen((value) => !value)}
                >
                    {t("accountMenu.trigger")}
                </button>
            ) : null}
            {open ? (
                <ul id={menuId} aria-label={t("accountMenu.options")} className={css.menu}>
                    {onChangePassword ? (
                        <li>
                            <button
                                type="button"
                                className={css.item}
                                onClick={() => choose(onChangePassword)}
                            >
                                {t("accountMenu.changePassword")}
                            </button>
                        </li>
                    ) : null}
                    {onLogout ? (
                        <li>
                            <button
                                type="button"
                                className={`${css.item} ${css.logout}`}
                                onClick={() => choose(onLogout)}
                            >
                                {t("accountMenu.logout")}
                            </button>
                        </li>
                    ) : null}
                </ul>
            ) : null}
        </div>
    )
}

export default AccountMenu
