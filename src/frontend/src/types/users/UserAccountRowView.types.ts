type UserAccountRowView = {
    id: number
    initials: string
    name: string
    isAdmin: boolean
    summary: string
    lastLogin: string | null
    active: boolean
    statusLabel: string
    unsaved: boolean
    selected: boolean
}

export default UserAccountRowView
