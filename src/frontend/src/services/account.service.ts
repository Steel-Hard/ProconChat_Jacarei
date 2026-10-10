import type { PanelAccount } from "@/types/account"

type Listener = () => void

let account: PanelAccount | null = null
const listeners = new Set<Listener>()

function notify() {
    listeners.forEach((listener) => listener())
}

export function getAccount(): PanelAccount | null {
    return account
}

export function setAccount(value: PanelAccount) {
    account = value
    notify()
}

export function clearAccount() {
    account = null
    notify()
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}
