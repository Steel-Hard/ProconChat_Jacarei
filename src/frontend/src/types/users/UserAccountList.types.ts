import type UserAccount from "@/types/users/UserAccount.types"

type UserAccountList = {
    items: UserAccount[]
    lastChange: { name: string; at: string } | null
}

export default UserAccountList
