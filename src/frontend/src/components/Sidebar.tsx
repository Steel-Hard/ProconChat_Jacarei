import { useId } from "react"
import { Link, useLocation } from "react-router-dom"
import type { NavBadges } from "@/hooks/useNavBadges"
import { activeNavKey, visibleNavGroups } from "@/routers/navigation"
import type { PanelAccount } from "@/types/account"
import css from "@/styles/components/sidebar.module.css"

type SidebarProps = {
    account: PanelAccount | null
    badges: NavBadges
    onNavigate?: () => void
    id?: string
}

function Sidebar({ account, badges, onNavigate, id }: SidebarProps) {
    const { pathname } = useLocation()
    const groupIdPrefix = useId()
    const activeKey = activeNavKey(pathname)
    const groups = visibleNavGroups(account)

    return (
        <nav id={id} aria-label="Menu principal" className={css.sidebar}>
            <div className={css.brand}>
                <p className={css.brandName}>ProconChat</p>
                <p className={css.brandSub}>Jacareí · Painel interno</p>
            </div>
            <div className={css.groups}>
                {groups.map((group, index) => {
                    const labelId = `${groupIdPrefix}-${index}`

                    return (
                        <div key={group.label} className={css.group}>
                            <p id={labelId} className={css.groupLabel}>
                                {group.label}
                            </p>
                            <ul aria-labelledby={labelId} className={css.items}>
                                {group.items.map((item) => {
                                    const active = item.key === activeKey
                                    const badge = badges[item.key]
                                    const showBadge = badge !== undefined && badge.count > 0

                                    return (
                                        <li key={item.key}>
                                            <Link
                                                to={item.path}
                                                className={
                                                    active ? `${css.link} ${css.active}` : css.link
                                                }
                                                aria-current={active ? "page" : undefined}
                                                onClick={onNavigate}
                                            >
                                                <span>{item.label}</span>
                                                {showBadge ? (
                                                    <>
                                                        {" "}
                                                        <span className={css.count}>
                                                            {badge.count}
                                                        </span>{" "}
                                                        <span className={css.visuallyHidden}>
                                                            {badge.label}
                                                        </span>
                                                    </>
                                                ) : null}
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )
                })}
            </div>
            <p className={css.footer}>Uso exclusivo de servidores do PROCON Jacareí.</p>
        </nav>
    )
}

export default Sidebar
