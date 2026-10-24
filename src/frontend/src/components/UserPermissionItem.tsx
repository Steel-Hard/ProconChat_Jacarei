import { useId } from "react"
import type PermissionKey from "@/types/account/PermissionKey.types"
import type UserPermissionItemView from "@/types/users/UserPermissionItemView.types"
import css from "@/styles/components/userPermissionItem.module.css"

type UserPermissionItemProps = {
    item: UserPermissionItemView
    onToggle: (key: PermissionKey) => void
}

function UserPermissionItem({ item, onToggle }: UserPermissionItemProps) {
    const warningId = useId()

    return (
        <label className={item.disabled ? `${css.item} ${css.disabled}` : css.item}>
            <input
                type="checkbox"
                className={css.checkbox}
                checked={item.checked}
                disabled={item.disabled}
                aria-describedby={item.warning ? warningId : undefined}
                onChange={() => onToggle(item.key)}
            />
            <span className={css.body}>
                <span className={css.name}>
                    {item.name}
                    {item.includes ? <span className={css.includes}>{item.includes}</span> : null}
                </span>
                <span className={css.description}>{item.description}</span>
                {item.warning ? (
                    <span id={warningId} className={css.warning}>
                        {item.warning}
                    </span>
                ) : null}
            </span>
        </label>
    )
}

export default UserPermissionItem
