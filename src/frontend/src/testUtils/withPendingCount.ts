type FetchHandler = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const PENDING_COUNT_PATH = "/api/v1/appointments/pending-count"

function neverAnswers(): Promise<Response> {
    return new Promise<Response>(() => {})
}

function withPendingCount(handler: FetchHandler = neverAnswers): FetchHandler {
    return (input, init) => {
        const url = input instanceof Request ? input.url : String(input)

        if (url.endsWith(PENDING_COUNT_PATH)) {
            return neverAnswers()
        }

        return handler(input, init)
    }
}

export default withPendingCount
