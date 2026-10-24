import NAV_ITEMS_READY from "@/navigation/navItemsReady"
import PERMISSION_KEYS from "@/navigation/permissionKeys"
import PERMISSION_SCREENS from "@/navigation/permissionScreens"
import type PermissionKey from "@/types/account/PermissionKey.types"

function readyPermissionKeys(): PermissionKey[] {
    return PERMISSION_KEYS.filter((key) => NAV_ITEMS_READY[PERMISSION_SCREENS[key]])
}

export default readyPermissionKeys
