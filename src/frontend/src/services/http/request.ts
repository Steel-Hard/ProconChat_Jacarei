import getLanguage from "@/i18n/getLanguage"
import API_URL from "@/services/http/apiUrl"
import authHandlers from "@/services/http/authHandlers"
import parseResponse from "@/services/http/parseResponse"
import clearToken from "@/services/session/clearToken"
import getToken from "@/services/session/getToken"
import setToken from "@/services/session/setToken"
import type HttpMethod from "@/types/http/HttpMethod.types"
import type HttpOptions from "@/types/http/HttpOptions.types"
import type TokenRefresher from "@/types/http/TokenRefresher.types"

function refreshOnce(refresher: TokenRefresher): Promise<string | null> {
    if (!authHandlers.pendingRefresh) {
        authHandlers.pendingRefresh = refresher()
            .catch(() => null)
            .finally(() => {
                authHandlers.pendingRefresh = null
            })
    }
    return authHandlers.pendingRefresh
}

function send(
    method: HttpMethod,
    path: string,
    body: unknown,
    options?: HttpOptions
): Promise<Response> {
    const headers: Record<string, string> = {
        Accept: "application/json",
        "Accept-Language": getLanguage()
    }
    const token = getToken()

    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    if (body !== undefined) {
        headers["Content-Type"] = "application/json"
    }

    return fetch(API_URL + path, {
        method,
        headers,
        credentials: "include",
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: options?.signal
    })
}

async function rejectUnauthorized(response: Response): Promise<never> {
    clearToken()
    authHandlers.unauthorizedHandler?.()
    return parseResponse<never>(response)
}

async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options?: HttpOptions,
    isRetry = false
): Promise<T> {
    const response = await send(method, path, body, options)

    if (response.status !== 401) {
        return parseResponse<T>(response)
    }

    const refresher = authHandlers.tokenRefresher

    if (isRetry || !refresher) {
        return rejectUnauthorized(response)
    }

    const newToken = await refreshOnce(refresher)

    if (!newToken) {
        return rejectUnauthorized(response)
    }

    setToken(newToken)
    return request<T>(method, path, body, options, true)
}

export default request
