import type UserAccountAction from "@/types/users/UserAccountAction.types"
import type UserPermissionItemView from "@/types/users/UserPermissionItemView.types"

type UserAccountPanelView = {
    initials: string
    name: string
    isAdmin: boolean
    adminLabel: string
    email: string
    lastLogin: string
    permissionsChanged: string
    resetPassword: UserAccountAction | null
    toggleActive: UserAccountAction | null
    changeMyPassword: string | null
    lockWarning: string | null
    adminNotes: string[]
    selfNote: string | null
    outranksNote: string | null
    permissionsHeading: string
    permissions: UserPermissionItemView[]
}

export default UserAccountPanelView
