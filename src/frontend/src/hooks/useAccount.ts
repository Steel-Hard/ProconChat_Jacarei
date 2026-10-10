import { useSyncExternalStore } from "react"
import { getAccount, subscribe } from "@/services/account.service"
import type { PanelAccount } from "@/types/account"

export function useAccount(): PanelAccount | null {
    return useSyncExternalStore(subscribe, getAccount)
}
