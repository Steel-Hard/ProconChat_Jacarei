type Listener = () => void

let token: string | null = null
const listeners = new Set<Listener>()

function notify() {
    listeners.forEach((listener) => listener())
}

export function getToken(): string | null {
    return token
}

export function setToken(value: string) {
    token = value
    notify()
}

export function clearToken() {
    token = null
    notify()
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}
