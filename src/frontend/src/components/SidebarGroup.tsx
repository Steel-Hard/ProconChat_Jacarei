import { useId } from "react"
import { useTranslation } from "react-i18next"
import SidebarLink from "@/components/SidebarLink"
import type NavBadges from "@/types/navigation/NavBadges.types"
import type NavGroup from "@/types/navigation/NavGroup.types"
import type NavKey from "@/types/navigation/NavKey.types"
import css from "@/styles/components/sidebarGroup.module.css"

type SidebarGroupProps = {
    group: NavGroup
    activeKey: NavKey | null
    badges: NavBadges
    onNavigate?: () => void
}

function SidebarGroup({ group, activeKey, badges, onNavigate }: SidebarGroupProps) {
    const { t } = useTranslation()
    const labelId = useId()

    return (
        <div className={css.group}>
            <p id={labelId} className={css.groupLabel}>
                {t(`navigation.groups.${group.key}`)}
            </p>
            <ul aria-labelledby={labelId} className={css.items}>
                {group.items.map((item) => (
                    <li key={item.key}>
                        <SidebarLink
                            item={item}
                            active={item.key === activeKey}
                            badge={badges[item.key]}
                            onNavigate={onNavigate}
                        />
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default SidebarGroup
