import notifyTokenListeners from "@/services/session/notifyTokenListeners"
import tokenState from "@/services/session/tokenState"

function setToken(value: string) {
    tokenState.token = value
    notifyTokenListeners()
}

export default setToken
