import type UserAccountList from "@/types/users/UserAccountList.types"

type AccountBatchResult = UserAccountList & {
    redistributed: number
}

export default AccountBatchResult
