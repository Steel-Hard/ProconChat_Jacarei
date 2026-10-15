import getLanguage from "@/i18n/getLanguage"
import API_URL from "@/services/http/apiUrl"
import authHandlers from "@/services/http/authHandlers"

const REFRESH_PATH = "/api/v1/auth/refresh"

async function requestRefresh(): Promise<boolean> {
    try {
        const response = await fetch(API_URL + REFRESH_PATH, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Accept-Language": getLanguage()
            },
            credentials: "include"
        })

        return response.status === 204
    } catch {
        return false
    }
}

function refreshSession(): Promise<boolean> {
    if (!authHandlers.pendingRefresh) {
        authHandlers.pendingRefresh = requestRefresh().finally(() => {
            authHandlers.pendingRefresh = null
        })
    }

    return authHandlers.pendingRefresh
}

export default refreshSession
