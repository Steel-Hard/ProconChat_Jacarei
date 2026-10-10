import tokenState from "@/services/session/tokenState"

function getToken(): string | null {
    return tokenState.token
}

export default getToken
