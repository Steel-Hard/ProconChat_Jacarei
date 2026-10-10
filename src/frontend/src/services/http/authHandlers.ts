import type TokenRefresher from "@/types/http/TokenRefresher.types"
import type UnauthorizedHandler from "@/types/http/UnauthorizedHandler.types"

type AuthHandlers = {
    tokenRefresher: TokenRefresher | null
    unauthorizedHandler: UnauthorizedHandler | null
    pendingRefresh: Promise<string | null> | null
}

const authHandlers: AuthHandlers = {
    tokenRefresher: null,
    unauthorizedHandler: null,
    pendingRefresh: null
}

export default authHandlers
