import tokenState from "@/services/session/tokenState"

function notifyTokenListeners() {
    tokenState.listeners.forEach((listener) => listener())
}

export default notifyTokenListeners
