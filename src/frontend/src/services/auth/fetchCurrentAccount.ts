import toPanelAccount from "@/services/auth/toPanelAccount"
import get from "@/services/http/get"
import type PanelAccount from "@/types/account/PanelAccount.types"

type MeResponse = {
    data: Parameters<typeof toPanelAccount>[0]
}

async function fetchCurrentAccount(signal?: AbortSignal): Promise<PanelAccount> {
    const { data } = await get<MeResponse>("/api/v1/auth/me", { signal })

    return toPanelAccount(data)
}

export default fetchCurrentAccount
