import request from "supertest"
import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("../services/auth.service", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../services/auth.service")>()),
    authService: {
        login: vi.fn(),
        refresh: vi.fn(),
        logout: vi.fn(),
        changePassword: vi.fn(),
    },
}))

async function appWithFrontendOrigin(value: string) {
    vi.resetModules()
    vi.stubEnv("FRONTEND_ORIGIN", value)
    return (await import("../app")).default
}

describe("FRONTEND_ORIGIN normalizada na leitura", () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.resetModules()
    })

    test.each(["http://localhost:5173/", "HTTP://LOCALHOST:5173", "http://Localhost:5173/painel"])(
        "aceita o Origin do navegador quando FRONTEND_ORIGIN e %s",
        async (configured) => {
            const app = await appWithFrontendOrigin(configured)

            const response = await request(app).post("/api/v1/auth/logout").set("Origin", "http://localhost:5173")

            expect(response.status).toBe(204)
        },
    )

    test("libera o CORS para a origem normalizada", async () => {
        const app = await appWithFrontendOrigin("HTTP://LOCALHOST:5173/")

        const response = await request(app)
            .options("/api/v1/auth/login")
            .set("Origin", "http://localhost:5173")
            .set("Access-Control-Request-Method", "POST")

        expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173")
    })
})
