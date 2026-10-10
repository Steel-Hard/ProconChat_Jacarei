import HttpError from "@/services/http/HttpError"

type ErrorBody = {
    error?: { code?: string; message?: string }
}

async function readErrorBody(response: Response): Promise<ErrorBody | null> {
    try {
        return (await response.json()) as ErrorBody
    } catch {
        return null
    }
}

async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const body = await readErrorBody(response)
        const message = body?.error?.message ?? `Requisição falhou com status ${response.status}.`
        throw new HttpError(response.status, message, body?.error?.code)
    }

    if (response.status === 204) {
        return undefined as T
    }

    return (await response.json()) as T
}

export default parseResponse
