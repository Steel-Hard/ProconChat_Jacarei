import { useEffect, useId, useRef, useState } from "react"
import { useShowAccountEmail } from "@/hooks/useMediaQuery"
import type { PanelAccount } from "@/types/account"
import css from "@/styles/components/accountMenu.module.css"

type AccountMenuProps = {
    account: PanelAccount
    onChangePassword?: () => void
    onLogout?: () => void
}

export function initialsOf(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean)

    if (words.length === 0) {
        return ""
    }

    const first = words[0].charAt(0)
    const last = words.length > 1 ? words[words.length - 1].charAt(0) : ""

    return `${first}${last}`.toUpperCase()
}

function AccountMenu({ account, onChangePassword, onLogout }: AccountMenuProps) {
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
                    {account.name}
                    {account.isAdmin ? (
                        <>
                            {" "}
                            <span className={css.admin}>ADMIN</span>
                        </>
                    ) : null}
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
                    Minha conta <span aria-hidden="true">▾</span>
                </button>
            ) : null}
            {open ? (
                <ul id={menuId} aria-label="Minha conta" className={css.menu}>
                    {onChangePassword ? (
                        <li>
                            <button
                                type="button"
                                className={css.item}
                                onClick={() => choose(onChangePassword)}
                            >
                                Alterar minha senha
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
                                Sair
                            </button>
                        </li>
                    ) : null}
                </ul>
            ) : null}
        </div>
    )
}

export default AccountMenu
