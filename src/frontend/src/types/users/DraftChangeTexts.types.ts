import type PermissionKey from "@/types/account/PermissionKey.types"

type DraftChangeTexts = {
    permissionName: (key: PermissionKey) => string
    grant: (name: string, permission: string) => string
    revoke: (name: string, permission: string) => string
    deactivate: (name: string) => string
    reactivate: (name: string) => string
    redistributed: (count: number) => string
}

export default DraftChangeTexts
