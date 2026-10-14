import express from "express"
import request from "supertest"
import { describe, expect, it } from "vitest"
import {
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    accessCookieOptions,
    clearAccessCookieOptions,
    clearRefreshCookieOptions,
    refreshCookieOptions,
} from "./sessionCookies"

const NOW = Date.UTC(2030, 0, 1, 12, 0, 0)
const REFRESH_EXPIRES_AT = new Date(NOW + 90 * 24 * 60 * 60 * 1000)

async function setCookies(nodeEnv: string | undefined): Promise<string[]> {
    const env = { NODE_ENV: nodeEnv }
    const app = express()
    app.get("/", (_req, res) => {
        res.cookie(ACCESS_COOKIE_NAME, "acesso", accessCookieOptions(env))
        res.cookie(REFRESH_COOKIE_NAME, "refresh", refreshCookieOptions(env, REFRESH_EXPIRES_AT, NOW))
        res.end()
    })
    const response = await request(app).get("/")
    return response.headers["set-cookie"] as unknown as string[]
}

async function clearCookies(): Promise<string[]> {
    const env = { NODE_ENV: "production" }
    const app = express()
    app.get("/", (_req, res) => {
        res.clearCookie(ACCESS_COOKIE_NAME, clearAccessCookieOptions(env))
        res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions(env))
        res.end()
    })
    const response = await request(app).get("/")
    return response.headers["set-cookie"] as unknown as string[]
}

describe("cookies da sessao", () => {
    it("usa os nomes fixos proconchat_access e proconchat_refresh", () => {
        expect([ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME]).toEqual(["proconchat_access", "proconchat_refresh"])
    })

    it("marca os dois cookies como Secure em producao", async () => {
        const cookies = await setCookies("production")

        expect(cookies).toHaveLength(2)
        cookies.forEach((cookie) => expect(cookie).toMatch(/; Secure/))
    })

    it("nao marca os cookies como Secure fora de producao", async () => {
        const cookies = await setCookies("development")

        cookies.forEach((cookie) => expect(cookie).not.toMatch(/Secure/))
    })

    it("define o cookie de acesso HttpOnly, SameSite=Strict, Path=/ e Max-Age de 1 hora", async () => {
        const [access] = await setCookies("production")

        expect(access).toMatch(/^proconchat_access=acesso;/)
        expect(access).toMatch(/; Max-Age=3600;/)
        expect(access).toMatch(/; Path=\/;/)
        expect(access).toMatch(/; HttpOnly/)
        expect(access).toMatch(/; SameSite=Strict/)
    })

    it("define o cookie de refresh HttpOnly, SameSite=Strict, Path=/api/v1/auth e Max-Age ate o vencimento", async () => {
        const [, refresh] = await setCookies("production")

        expect(refresh).toMatch(/^proconchat_refresh=refresh;/)
        expect(refresh).toMatch(/; Max-Age=7776000;/)
        expect(refresh).toMatch(/; Path=\/api\/v1\/auth;/)
        expect(refresh).toMatch(/; HttpOnly/)
        expect(refresh).toMatch(/; SameSite=Strict/)
    })

    it("limpa cada cookie com o seu proprio Path", async () => {
        const [access, refresh] = await clearCookies()

        expect(access).toMatch(/^proconchat_access=;/)
        expect(access).toMatch(/; Path=\/;/)
        expect(access).toMatch(/Expires=Thu, 01 Jan 1970/)
        expect(refresh).toMatch(/^proconchat_refresh=;/)
        expect(refresh).toMatch(/; Path=\/api\/v1\/auth;/)
        expect(refresh).toMatch(/Expires=Thu, 01 Jan 1970/)
    })
})
