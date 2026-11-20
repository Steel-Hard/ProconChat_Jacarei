export default class ProviderRequestError extends Error {
    public readonly providerErrorCode: string | null

    constructor(status: number, providerErrorCode: string | null) {
        super(`Cloud API returned HTTP ${status}`)
        this.name = "ProviderRequestError"
        this.providerErrorCode = providerErrorCode
    }
}
