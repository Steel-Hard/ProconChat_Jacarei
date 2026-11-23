import type UserApiAction from "@/types/users/UserApiAction.types"
import type UserErrorCode from "@/types/users/UserErrorCode.types"

type UserApiError = {
    key:
        | `errors.codes.${UserErrorCode}`
        | "errors.forbidden"
        | `errors.badRequest.${"create" | "reset" | "save"}`
        | `errors.failed.${UserApiAction}`
        | "common:errors.invalidOrigin"
    code: UserErrorCode | null
    userId?: number
    values?: { protocol?: string; conflictingProtocol?: string }
}

export default UserApiError
