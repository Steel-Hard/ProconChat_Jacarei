import { Trans, useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import type NavBadge from "@/types/navigation/NavBadge.types"
import type NavItem from "@/types/navigation/NavItem.types"
import css from "@/styles/components/sidebarLink.module.css"

type SidebarLinkProps = {
    item: NavItem
    active: boolean
    badge?: NavBadge
    onNavigate?: () => void
}

function SidebarLink({ item, active, badge, onNavigate }: SidebarLinkProps) {
    const { t } = useTranslation()
    const showBadge = badge !== undefined && badge.count > 0

    return (
        <Link
            to={item.path}
            className={active ? `${css.link} ${css.active}` : css.link}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
        >
            {showBadge ? (
                <Trans
                    t={t}
                    i18nKey="navigation.itemWithBadge"
                    values={{
                        label: t(`navigation.items.${item.key}.label`),
                        count: badge.count,
                        badgeLabel: badge.label
                    }}
                    components={{
                        label: <span />,
                        count: <span className={css.count} />,
                        hidden: <span className={css.visuallyHidden} />
                    }}
                />
            ) : (
                <span>{t(`navigation.items.${item.key}.label`)}</span>
            )}
        </Link>
    )
}

export default SidebarLink
