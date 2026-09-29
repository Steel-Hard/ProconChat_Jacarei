import { clearToken, getToken, setToken } from "@/services/session.service"

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
type TokenRefresher = () => Promise<string | null>
type UnauthorizedHandler = () => void

type ErrorBody = {
    error?: { code?: string; message?: string }
}

export class HttpError extends Error {
    readonly status: number
    readonly code?: string

    constructor(status: number, message: string, code?: string) {
        super(message)
        this.name = "HttpError"
        this.status = status
        this.code = code
    }
}

let tokenRefresher: TokenRefresher | null = null
let unauthorizedHandler: UnauthorizedHandler | null = null
let pendingRefresh: Promise<string | null> | null = null

export function setTokenRefresher(refresher: TokenRefresher | null) {
    tokenRefresher = refresher
}

export function onUnauthorized(handler: UnauthorizedHandler | null) {
    unauthorizedHandler = handler
}

function buildUrl(path: string): string {
    return `${import.meta.env.VITE_API_URL ?? ""}${path}`
}

async function readErrorBody(response: Response): Promise<ErrorBody | null> {
    try {
        return (await response.json()) as ErrorBody
    } catch {
        return null
    }
}

async function toHttpError(response: Response): Promise<HttpError> {
    const body = await readErrorBody(response)
    const message = body?.error?.message ?? `Requisição falhou com status ${response.status}.`
    return new HttpError(response.status, message, body?.error?.code)
}

function refreshOnce(refresher: TokenRefresher): Promise<string | null> {
    if (!pendingRefresh) {
        pendingRefresh = refresher()
            .catch(() => null)
            .finally(() => {
                pendingRefresh = null
            })
    }
    return pendingRefresh
}

function rejectUnauthorized(error: HttpError): never {
    clearToken()
    unauthorizedHandler?.()
    throw error
}

async function send(method: Method, path: string, body: unknown): Promise<Response> {
    const headers: Record<string, string> = { Accept: "application/json" }
    const token = getToken()
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }
    if (body !== undefined) {
        headers["Content-Type"] = "application/json"
    }
    return fetch(buildUrl(path), {
        method,
        headers,
        credentials: "include",
        body: body === undefined ? undefined : JSON.stringify(body)
    })
}

async function request<T>(
    method: Method,
    path: string,
    body: unknown,
    isRetry: boolean
): Promise<T> {
    const response = await send(method, path, body)

    if (response.status === 401) {
        const error = await toHttpError(response)
        if (isRetry || !tokenRefresher) {
            return rejectUnauthorized(error)
        }
        const newToken = await refreshOnce(tokenRefresher)
        if (!newToken) {
            return rejectUnauthorized(error)
        }
        setToken(newToken)
        return request<T>(method, path, body, true)
    }

    if (!response.ok) {
        throw await toHttpError(response)
    }
    if (response.status === 204) {
        return undefined as T
    }
    return (await response.json()) as T
}

export function get<T>(path: string): Promise<T> {
    return request<T>("GET", path, undefined, false)
}

export function post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("POST", path, body, false)
}

export function put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PUT", path, body, false)
}

export function patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PATCH", path, body, false)
}

export function del<T>(path: string): Promise<T> {
    return request<T>("DELETE", path, undefined, false)
}
