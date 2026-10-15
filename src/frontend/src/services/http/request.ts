import getLanguage from "@/i18n/getLanguage"
import API_URL from "@/services/http/apiUrl"
import authHandlers from "@/services/http/authHandlers"
import parseResponse from "@/services/http/parseResponse"
import refreshSession from "@/services/http/refreshSession"
import type HttpMethod from "@/types/http/HttpMethod.types"
import type HttpOptions from "@/types/http/HttpOptions.types"

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

    if (response.status !== 401 || options?.skipSessionRenewal) {
        return parseResponse<T>(response)
    }

    if (isRetry) {
        return rejectUnauthorized(response)
    }

    const renewed = await refreshSession()

    if (!renewed) {
        return rejectUnauthorized(response)
    }

    return request<T>(method, path, body, options, true)
}

export default request
