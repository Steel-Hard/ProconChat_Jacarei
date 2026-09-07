import { afterEach, describe, expect, test, vi } from "vitest"
import { evolutionGateway } from "./evolution.gateway"

describe("Evolution gateway", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete process.env.EVOLUTION_API_URL
        delete process.env.EVOLUTION_API_KEY
    })

    test("envia texto no formato esperado pela Evolution API", async () => {
        process.env.EVOLUTION_API_URL = "http://evolution-api:8080/"
        process.env.EVOLUTION_API_KEY = "test-key"
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 })
        vi.stubGlobal("fetch", fetchMock)

        await evolutionGateway.sendText({
            instance: "procon teste",
            number: "5511999999999",
            text: "Ola",
        })

        expect(fetchMock).toHaveBeenCalledOnce()
        expect(fetchMock.mock.calls[0]?.[0]).toBe(
            "http://evolution-api:8080/message/sendText/procon%20teste",
        )
        expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: "test-key" },
            body: JSON.stringify({ number: "5511999999999", text: "Ola" }),
        })
    })

    test("falha quando a Evolution nao esta configurada", async () => {
        await expect(
            evolutionGateway.sendText({
                instance: "procon",
                number: "5511999999999",
                text: "Ola",
            }),
        ).rejects.toThrow("Evolution API is not configured")
    })

    test("propaga resposta HTTP sem sucesso", async () => {
        process.env.EVOLUTION_API_URL = "http://evolution-api:8080"
        process.env.EVOLUTION_API_KEY = "test-key"
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }))

        await expect(
            evolutionGateway.sendText({
                instance: "procon",
                number: "5511999999999",
                text: "Ola",
            }),
        ).rejects.toThrow("Evolution API returned HTTP 401")
    })
})
