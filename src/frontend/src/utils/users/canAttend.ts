import type UserAccount from "@/types/users/UserAccount.types"

function canAttend(account: UserAccount): boolean {
    return (
        account.active && (account.isAdmin || account.permissions.includes("appointments.manage"))
    )
}

export default canAttend
