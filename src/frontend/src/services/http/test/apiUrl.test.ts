import { afterEach, describe, expect, it, vi } from "vitest"

async function importApiUrl() {
    vi.resetModules()
    const { default: apiUrl } = await import("@/services/http/apiUrl")
    return apiUrl
}

afterEach(() => {
    vi.unstubAllEnvs()
})

describe("apiUrl", () => {
    it("devolve o valor de VITE_API_URL quando a variável está definida", async () => {
        vi.stubEnv("VITE_API_URL", "https://api.example.com")

        expect(await importApiUrl()).toBe("https://api.example.com")
    })

    it("devolve string vazia quando a variável não está definida", async () => {
        vi.stubEnv("VITE_API_URL", undefined)

        expect(await importApiUrl()).toBe("")
    })
})
