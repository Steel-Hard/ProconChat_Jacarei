import toPanelAccount from "@/services/auth/toPanelAccount"
import post from "@/services/http/post"
import type PanelAccount from "@/types/account/PanelAccount.types"

type LoginResponse = {
    data: { user: Parameters<typeof toPanelAccount>[0] }
}

async function signIn(email: string, password: string): Promise<PanelAccount> {
    const { data } = await post<LoginResponse>(
        "/api/v1/auth/login",
        { email, password },
        { skipSessionRenewal: true }
    )

    return toPanelAccount(data.user)
}

export default signIn
