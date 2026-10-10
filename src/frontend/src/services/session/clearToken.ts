import notifyTokenListeners from "@/services/session/notifyTokenListeners"
import tokenState from "@/services/session/tokenState"

function clearToken() {
    tokenState.token = null
    notifyTokenListeners()
}

export default clearToken
