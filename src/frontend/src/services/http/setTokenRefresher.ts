import authHandlers from "@/services/http/authHandlers"
import type TokenRefresher from "@/types/http/TokenRefresher.types"

function setTokenRefresher(refresher: TokenRefresher | null) {
    authHandlers.tokenRefresher = refresher
}

export default setTokenRefresher
