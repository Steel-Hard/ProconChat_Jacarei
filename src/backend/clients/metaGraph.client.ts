import { createHmac } from "node:crypto"
import { AccessTokenLifetime, ConnectionCheckInput, ConnectionCheckResult, ConnectionTestReason } from "../types/whatsappSettings.types"
import { MetaGraphClient } from "./metaGraph.client.interface"

export const META_TIMEOUT_MS = 10_000
export const META_TOKEN_INSPECTION_TIMEOUT_MS = 5_000
const GRAPH_BASE_URL = "https://graph.facebook.com"
const UNKNOWN_OBJECT_SUBCODE = 33

export type FetchFn = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>

interface MetaGraphClientDependencies {
    fetchFn?: FetchFn
    timeoutMs?: number
    inspectionTimeoutMs?: number
    logger?: Pick<Console, "log">
}

interface GraphError {
    code?: unknown
    error_subcode?: unknown
    message?: unknown
}

type CallKind = "phone" | "account"

type InspectionFailure = { status?: number; code?: number }

const UNKNOWN_LIFETIME: AccessTokenLifetime = { kind: "UNKNOWN", expiresAt: null }

type CallOutcome = { ok: true; body: unknown } | { ok: false; reason: ConnectionTestReason; status?: number; code?: number }

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function reasonForError(error: GraphError, kind: CallKind): ConnectionTestReason {
    const message = typeof error.message === "string" ? error.message : ""
    if (error.code === 190) {
        return "INVALID_TOKEN"
    }
    if (error.code === 100 && message.includes("appsecret_proof")) {
        return "INVALID_APP_SECRET"
    }
    if (error.code === 100 && error.error_subcode === UNKNOWN_OBJECT_SUBCODE) {
        return kind === "phone" ? "PHONE_NUMBER_NOT_FOUND" : "BUSINESS_ACCOUNT_NOT_FOUND"
    }
    if (error.code === 10 || error.code === 200) {
        return "MISSING_PERMISSION"
    }
    if (error.code === 4 || error.code === 80007) {
        return "META_UNAVAILABLE"
    }
    return "META_ERROR"
}

function lifetimeFrom(body: unknown): AccessTokenLifetime | null {
    const data = isRecord(body) && isRecord(body.data) ? body.data : null
    if (data === null || data.is_valid !== true) {
        return null
    }
    const expiresAt = data.expires_at
    if (typeof expiresAt !== "number" || !Number.isInteger(expiresAt) || expiresAt < 0) {
        return null
    }
    if (expiresAt === 0) {
        return { kind: "PERMANENT", expiresAt: null }
    }
    const date = new Date(expiresAt * 1000)
    if (Number.isNaN(date.getTime())) {
        return null
    }
    return { kind: "EXPIRING", expiresAt: date.toISOString() }
}

async function readJson(response: Pick<Response, "json">): Promise<unknown> {
    try {
        return await response.json()
    } catch {
        return undefined
    }
}

export function createMetaGraphClient({
    fetchFn = (url, init) => fetch(url, init),
    timeoutMs = META_TIMEOUT_MS,
    inspectionTimeoutMs = META_TOKEN_INSPECTION_TIMEOUT_MS,
    logger = console,
}: MetaGraphClientDependencies = {}): MetaGraphClient {
    function unknownLifetime(failure: InspectionFailure = {}): AccessTokenLifetime {
        logger.log(JSON.stringify({ event: "meta_token_inspection", outcome: "unknown", status: failure.status, code: failure.code }))
        return UNKNOWN_LIFETIME
    }

    async function requestInspection(input: ConnectionCheckInput): Promise<AccessTokenLifetime> {
        const proof = createHmac("sha256", input.appSecret).update(input.accessToken).digest("hex")
        const params = new URLSearchParams({ input_token: input.accessToken, appsecret_proof: proof })
        const response = await fetchFn(
            `${GRAPH_BASE_URL}/${encodeURIComponent(input.graphApiVersion)}/debug_token?${params.toString()}`,
            {
                method: "GET",
                headers: { Authorization: `Bearer ${input.accessToken}` },
                signal: AbortSignal.timeout(inspectionTimeoutMs),
            },
        )
        const body = await readJson(response)
        if (!response.ok) {
            const error = isRecord(body) && isRecord(body.error) ? body.error : {}
            return unknownLifetime({ status: response.status, code: typeof error.code === "number" ? error.code : undefined })
        }
        return lifetimeFrom(body) ?? unknownLifetime({ status: response.status })
    }

    async function call(path: string, query: Record<string, string>, input: ConnectionCheckInput, kind: CallKind): Promise<CallOutcome> {
        const proof = createHmac("sha256", input.appSecret).update(input.accessToken).digest("hex")
        const params = new URLSearchParams({ ...query, appsecret_proof: proof })
        const url = `${GRAPH_BASE_URL}/${encodeURIComponent(input.graphApiVersion)}/${path}?${params.toString()}`

        let response: Pick<Response, "ok" | "status" | "json">
        try {
            response = await fetchFn(url, {
                method: "GET",
                headers: { Authorization: `Bearer ${input.accessToken}` },
                signal: AbortSignal.timeout(timeoutMs),
            })
        } catch {
            return { ok: false, reason: "META_UNAVAILABLE" }
        }

        const body = await readJson(response)
        if (response.ok) {
            return { ok: true, body }
        }
        if (response.status >= 500) {
            return { ok: false, reason: "META_UNAVAILABLE", status: response.status }
        }
        const error: GraphError = isRecord(body) && isRecord(body.error) ? body.error : {}
        return {
            ok: false,
            reason: reasonForError(error, kind),
            status: response.status,
            code: typeof error.code === "number" ? error.code : undefined,
        }
    }

    function fail(outcome: { reason: ConnectionTestReason; status?: number; code?: number }): ConnectionCheckResult {
        logger.log(
            JSON.stringify({ event: "meta_connection_test", reason: outcome.reason, status: outcome.status, code: outcome.code }),
        )
        return { ok: false, reason: outcome.reason }
    }

    return {
        async checkConnection(input) {
            const phone = await call(
                encodeURIComponent(input.phoneNumberId),
                { fields: "display_phone_number,verified_name" },
                input,
                "phone",
            )
            if (!phone.ok) {
                return fail(phone)
            }
            const phoneBody = isRecord(phone.body) ? phone.body : {}
            const displayPhoneNumber = phoneBody.display_phone_number
            const verifiedName = phoneBody.verified_name
            if (typeof displayPhoneNumber !== "string" || typeof verifiedName !== "string") {
                return fail({ reason: "META_ERROR" })
            }

            if (input.businessAccountId) {
                const account = await call(
                    `${encodeURIComponent(input.businessAccountId)}/phone_numbers`,
                    { fields: "id", limit: "100" },
                    input,
                    "account",
                )
                if (!account.ok) {
                    return fail(account)
                }
                const numbers = isRecord(account.body) && Array.isArray(account.body.data) ? account.body.data : []
                const belongs = numbers.some((item: unknown) => isRecord(item) && item.id === input.phoneNumberId)
                if (!belongs) {
                    return fail({ reason: "PHONE_NOT_IN_ACCOUNT" })
                }
            }

            return { ok: true, displayPhoneNumber, verifiedName }
        },

        async inspectAccessToken(input) {
            try {
                return await requestInspection(input)
            } catch {
                return unknownLifetime()
            }
        },
    }
}

export const metaGraphClient = createMetaGraphClient()
