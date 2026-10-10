import type { Ref } from "react"
import { Link, useLocation } from "react-router-dom"
import AccountMenu from "@/components/AccountMenu"
import breadcrumbFor from "@/navigation/breadcrumbFor"
import type PanelAccount from "@/types/account/PanelAccount.types"
import css from "@/styles/components/topbar.module.css"

type TopbarProps = {
    account: PanelAccount | null
    showMenuButton: boolean
    menuOpen: boolean
    menuControls: string
    menuButtonRef?: Ref<HTMLButtonElement>
    onOpenMenu: () => void
    onChangePassword?: () => void
    onLogout?: () => void
}

function Topbar({
    account,
    showMenuButton,
    menuOpen,
    menuControls,
    menuButtonRef,
    onOpenMenu,
    onChangePassword,
    onLogout
}: TopbarProps) {
    const { pathname } = useLocation()
    const crumb = breadcrumbFor(pathname)

    return (
        <header className={css.topbar}>
            <div className={css.start}>
                {showMenuButton ? (
                    <button
                        ref={menuButtonRef}
                        type="button"
                        className={css.menuButton}
                        aria-expanded={menuOpen}
                        aria-controls={menuControls}
                        onClick={onOpenMenu}
                    >
                        <span aria-hidden="true">☰</span> Menu
                    </button>
                ) : null}
                <nav aria-label="Trilha" className={css.trail}>
                    {crumb ? (
                        <>
                            <span>{crumb.group}</span>
                            {crumb.parent ? (
                                <>
                                    <span className={css.separator} aria-hidden="true">
                                        /
                                    </span>
                                    <Link to={crumb.parent.path} className={css.parent}>
                                        {crumb.parent.label}
                                    </Link>
                                </>
                            ) : null}
                            <span className={css.separator} aria-hidden="true">
                                /
                            </span>
                            <span className={css.current} aria-current="page">
                                {crumb.title}
                            </span>
                        </>
                    ) : null}
                </nav>
            </div>
            {account ? (
                <AccountMenu
                    account={account}
                    onChangePassword={onChangePassword}
                    onLogout={onLogout}
                />
            ) : null}
        </header>
    )
}

export default Topbar
