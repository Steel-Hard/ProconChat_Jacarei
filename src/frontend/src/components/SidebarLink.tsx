import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import type NavItem from "@/types/navigation/NavItem.types"
import css from "@/styles/components/sidebarLink.module.css"

type SidebarLinkProps = {
    item: NavItem
    active: boolean
    onNavigate?: () => void
}

function SidebarLink({ item, active, onNavigate }: SidebarLinkProps) {
    const { t } = useTranslation()

    return (
        <Link
            to={item.path}
            className={active ? `${css.link} ${css.active}` : css.link}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
        >
            <span>{t(`navigation.items.${item.key}.label`)}</span>
        </Link>
    )
}

export default SidebarLink
