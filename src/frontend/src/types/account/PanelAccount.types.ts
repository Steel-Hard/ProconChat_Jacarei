import type PermissionKey from "@/types/account/PermissionKey.types"

type PanelAccount = {
    name: string
    email: string
    isAdmin: boolean
    permissions: PermissionKey[]
}

export default PanelAccount
