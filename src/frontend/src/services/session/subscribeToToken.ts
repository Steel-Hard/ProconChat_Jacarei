import tokenState from "@/services/session/tokenState"

function subscribeToToken(listener: () => void): () => void {
    tokenState.listeners.add(listener)
    return () => {
        tokenState.listeners.delete(listener)
    }
}

export default subscribeToToken
