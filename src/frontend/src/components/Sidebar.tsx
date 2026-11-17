import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"
import SidebarGroup from "@/components/SidebarGroup"
import activeNavKey from "@/navigation/activeNavKey"
import sidebarNavGroups from "@/navigation/sidebarNavGroups"
import type PanelAccount from "@/types/account/PanelAccount.types"
import css from "@/styles/components/sidebar.module.css"

type SidebarProps = {
    account: PanelAccount | null
    onNavigate?: () => void
    id?: string
}

function Sidebar({ account, onNavigate, id }: SidebarProps) {
    const { t } = useTranslation()
    const { pathname } = useLocation()
    const activeKey = activeNavKey(pathname)

    return (
        <nav id={id} aria-label={t("sidebar.label")} className={css.sidebar}>
            <div className={css.brand}>
                <p className={css.brandName}>{t("sidebar.brand")}</p>
                <p className={css.brandSub}>{t("sidebar.subtitle")}</p>
            </div>
            <div className={css.groups}>
                {sidebarNavGroups(account).map((group) => (
                    <SidebarGroup
                        key={group.key}
                        group={group}
                        activeKey={activeKey}
                        onNavigate={onNavigate}
                    />
                ))}
            </div>
            <p className={css.footer}>{t("sidebar.footer")}</p>
        </nav>
    )
}

export default Sidebar
