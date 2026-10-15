import type PermissionKey from "@/types/account/PermissionKey.types"

type PanelAccount = {
    id: number
    name: string
    email: string
    isAdmin: boolean
    permissions: PermissionKey[]
}

export default PanelAccount
