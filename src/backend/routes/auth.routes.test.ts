import request from "supertest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { authService } from "../services/auth.service"

vi.mock("../services/auth.service", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../services/auth.service")>()),
    authService: {
        login: vi.fn(),
        refresh: vi.fn(),
        logout: vi.fn(),
        changePassword: vi.fn(),
    },
}))

const ORIGIN = "http://localhost:5173"

describe("CORS e CSRF das rotas do painel", () => {
    beforeEach(() => vi.clearAllMocks())

    test("permite a origem do painel com credenciais", async () => {
        const response = await request(app)
            .options("/api/v1/auth/login")
            .set("Origin", ORIGIN)
            .set("Access-Control-Request-Method", "POST")

        expect(response.headers["access-control-allow-origin"]).toBe(ORIGIN)
        expect(response.headers["access-control-allow-credentials"]).toBe("true")
    })

    test("nao devolve Access-Control-Allow-Origin para outra origem", async () => {
        const response = await request(app)
            .options("/api/v1/auth/login")
            .set("Origin", "https://atacante.example")
            .set("Access-Control-Request-Method", "POST")

        expect(response.headers["access-control-allow-origin"]).toBeUndefined()
    })

    test("responde 403 INVALID_ORIGIN para origem errada mesmo com cookie e nao chama o servico", async () => {
        const response = await request(app)
            .post("/api/v1/auth/logout")
            .set("Origin", "https://atacante.example")
            .set("Cookie", "proconchat_access=qualquer; proconchat_refresh=qualquer")

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "INVALID_ORIGIN", message: "Request origin is not allowed" } })
        expect(authService.logout).not.toHaveBeenCalled()
    })

    test("segue sem Origin quando o Referer e do painel", async () => {
        const response = await request(app).post("/api/v1/auth/logout").set("Referer", `${ORIGIN}/conta`)

        expect(response.status).toBe(204)
    })

    test("verifica a origem tambem nas rotas novas sob /api/v1 antes do 404", async () => {
        const response = await request(app).post("/api/v1/rota-futura-do-painel")

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe("INVALID_ORIGIN")
    })

    test("mantem o GET de rota inexistente sob /api/v1 sem verificacao de origem", async () => {
        const response = await request(app).get("/api/v1/rota-futura-do-painel")

        expect(response.status).toBe(404)
    })
})
