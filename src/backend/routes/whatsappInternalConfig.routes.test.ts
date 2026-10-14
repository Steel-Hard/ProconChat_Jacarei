import request from "supertest"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import InternalServerError from "../errors/InternalServerError"
import { whatsappSettingsService } from "../services/whatsappSettings.service"

vi.mock("../services/whatsappSettings.service", () => ({
    whatsappSettingsService: { getInternalConfig: vi.fn() },
}))

const PATH = "/api/v1/internal/whatsapp/config"
const config = {
    phoneNumberId: "100000000000001",
    accessToken: "EAAG-token-ficticio",
    appSecret: "segredo-ficticio-do-app",
    verifyToken: "3f9a".repeat(16),
    graphApiVersion: "v26.0",
}

describe("GET /api/v1/internal/whatsapp/config", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(console, "log").mockImplementation(() => undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test("recusa a requisicao sem o token interno", async () => {
        const response = await request(app).get(PATH)

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid gateway internal token" } })
        expect(whatsappSettingsService.getInternalConfig).not.toHaveBeenCalled()
    })

    test("recusa a requisicao com o token interno errado", async () => {
        const response = await request(app).get(PATH).set("X-Internal-Token", "token-errado")

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid gateway internal token" } })
        expect(whatsappSettingsService.getInternalConfig).not.toHaveBeenCalled()
    })

    test("devolve a configuracao decifrada com no-store para o token interno valido", async () => {
        vi.mocked(whatsappSettingsService.getInternalConfig).mockResolvedValue(config)

        const response = await request(app).get(PATH).set("X-Internal-Token", process.env.GATEWAY_INTERNAL_TOKEN as string)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: config })
        expect(response.headers["cache-control"]).toBe("no-store")
    })

    test("responde 500 generico sem valores quando um segredo nao decifra", async () => {
        vi.mocked(whatsappSettingsService.getInternalConfig).mockRejectedValue(new InternalServerError("Internal Server Error"))

        const response = await request(app).get(PATH).set("X-Internal-Token", process.env.GATEWAY_INTERNAL_TOKEN as string)

        expect(response.status).toBe(500)
        expect(response.body).toEqual({ error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" } })
    })
})
