import authHandlers from "@/services/http/authHandlers"
import type UnauthorizedHandler from "@/types/http/UnauthorizedHandler.types"

function onUnauthorized(handler: UnauthorizedHandler | null) {
    authHandlers.unauthorizedHandler = handler
}

export default onUnauthorized
