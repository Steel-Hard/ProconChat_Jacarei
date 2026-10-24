import HttpError from "@/services/http/HttpError"
import type UserApiAction from "@/types/users/UserApiAction.types"
import type UserApiError from "@/types/users/UserApiError.types"
import type UserErrorCode from "@/types/users/UserErrorCode.types"

type ErrorBody = { code: string | null; details: Record<string, unknown> }

const USER_ERROR_CODES: readonly string[] = [
    "EMAIL_ALREADY_IN_USE",
    "SELF_ACCOUNT_LOCKED",
    "TARGET_HAS_MORE_PERMISSIONS",
    "PERMISSION_NOT_HELD",
    "ADMIN_ACCOUNT_LOCKED",
    "NOT_FOUND",
    "REASSIGNMENT_REQUIRED",
    "INVALID_REASSIGNMENT_TARGET",
    "REASSIGNMENT_TARGET_BUSY"
] satisfies UserErrorCode[]

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function errorBodyOf(data: unknown): ErrorBody {
    if (!isRecord(data) || !isRecord(data.error)) {
        return { code: null, details: {} }
    }

    const { code, details } = data.error

    return {
        code: typeof code === "string" ? code : null,
        details: isRecord(details) ? details : {}
    }
}

function isUserErrorCode(code: string | null): code is UserErrorCode {
    return code !== null && USER_ERROR_CODES.includes(code)
}

function codeError(code: UserErrorCode, details: Record<string, unknown>): UserApiError {
    const result: UserApiError = { key: `errors.codes.${code}`, code }

    if (typeof details.userId === "number") {
        result.userId = details.userId
    }

    if (typeof details.protocol === "string" && typeof details.conflictingProtocol === "string") {
        result.values = {
            protocol: details.protocol,
            conflictingProtocol: details.conflictingProtocol
        }
    }

    return result
}

function responseOf(error: unknown): { status: number | string; body: ErrorBody } | null {
    if (error instanceof HttpError) {
        return { status: error.status, body: { code: error.code ?? null, details: {} } }
    }

    if (!isRecord(error) || !("status" in error)) {
        return null
    }

    const status = typeof error.status === "number" ? error.status : String(error.status)

    return { status, body: errorBodyOf(error.data) }
}

function userApiErrorOf(error: unknown, action: UserApiAction): UserApiError | null {
    const failed: UserApiError = { key: `errors.failed.${action}`, code: null }
    const response = responseOf(error)

    if (response === null) {
        return failed
    }

    const { status } = response
    const { code, details } = response.body

    if (status === 401) {
        return null
    }

    if (isUserErrorCode(code)) {
        return codeError(code, details)
    }

    if (status === 403) {
        return {
            key: code === "INVALID_ORIGIN" ? "common:errors.invalidOrigin" : "errors.forbidden",
            code: null
        }
    }

    if (status === 400 && (action === "create" || action === "reset" || action === "save")) {
        return { key: `errors.badRequest.${action}`, code: null }
    }

    return failed
}

export default userApiErrorOf
