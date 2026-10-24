import post from "@/services/http/post"
import type CreateAccountInput from "@/types/users/CreateAccountInput.types"
import type UserAccount from "@/types/users/UserAccount.types"

async function createUserAccount(input: CreateAccountInput): Promise<UserAccount> {
    const response = await post<{ data: UserAccount }>("/api/v1/users", input)

    return response.data
}

export default createUserAccount
