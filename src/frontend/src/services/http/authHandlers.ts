import type UnauthorizedHandler from "@/types/http/UnauthorizedHandler.types"

type AuthHandlers = {
    unauthorizedHandler: UnauthorizedHandler | null
    pendingRefresh: Promise<boolean> | null
}

const authHandlers: AuthHandlers = {
    unauthorizedHandler: null,
    pendingRefresh: null
}

export default authHandlers
