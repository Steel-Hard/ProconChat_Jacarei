import express from "express"
import request from "supertest"
import { describe, expect, it } from "vitest"
import errorHandler from "./errorHandler.middleware"
import { createRequireTrustedOrigin } from "./trustedOrigin.middleware"

const FRONTEND_ORIGIN = "http://localhost:5173"

function buildApp() {
    const app = express()
    app.use(createRequireTrustedOrigin(FRONTEND_ORIGIN))
    app.all("/acao", (_req, res) => {
        res.status(200).json({ data: { ok: true } })
    })
    app.use(errorHandler)
    return app
}

const rejected = {
    error: { code: "INVALID_ORIGIN", message: "Request origin is not allowed" },
}

describe("requireTrustedOrigin", () => {
    it("segue quando o Origin e igual ao FRONTEND_ORIGIN", async () => {
        const response = await request(buildApp()).post("/acao").set("Origin", FRONTEND_ORIGIN)

        expect(response.status).toBe(200)
    })

    it("responde 403 INVALID_ORIGIN quando o Origin e diferente", async () => {
        const response = await request(buildApp()).post("/acao").set("Origin", "https://atacante.example")

        expect(response.status).toBe(403)
        expect(response.body).toEqual(rejected)
    })

    it("responde 403 quando o Origin tem o mesmo host com outra porta", async () => {
        const response = await request(buildApp()).post("/acao").set("Origin", "http://localhost:8081")

        expect(response.status).toBe(403)
        expect(response.body).toEqual(rejected)
    })

    it("responde 403 quando o Origin tem barra no fim", async () => {
        const response = await request(buildApp()).post("/acao").set("Origin", `${FRONTEND_ORIGIN}/`)

        expect(response.status).toBe(403)
    })

    it("segue sem Origin quando a origem do Referer e igual", async () => {
        const response = await request(buildApp()).post("/acao").set("Referer", `${FRONTEND_ORIGIN}/painel/conta?aba=1`)

        expect(response.status).toBe(200)
    })

    it("responde 403 sem Origin quando o Referer e de outra origem", async () => {
        const response = await request(buildApp()).post("/acao").set("Referer", "https://atacante.example/pagina")

        expect(response.status).toBe(403)
        expect(response.body).toEqual(rejected)
    })

    it("responde 403 quando o Origin e diferente mesmo com o Referer certo", async () => {
        const response = await request(buildApp())
            .post("/acao")
            .set("Origin", "https://atacante.example")
            .set("Referer", `${FRONTEND_ORIGIN}/painel`)

        expect(response.status).toBe(403)
    })

    it("responde 403 sem Origin e sem Referer", async () => {
        const response = await request(buildApp()).post("/acao")

        expect(response.status).toBe(403)
        expect(response.body).toEqual(rejected)
    })

    it("responde 403 quando o Referer esta malformado", async () => {
        const response = await request(buildApp()).post("/acao").set("Referer", "nao e uma url")

        expect(response.status).toBe(403)
        expect(response.body).toEqual(rejected)
    })

    it("nao verifica a origem no GET", async () => {
        const response = await request(buildApp()).get("/acao")

        expect(response.status).toBe(200)
    })

    it("nao verifica a origem no HEAD", async () => {
        const response = await request(buildApp()).head("/acao")

        expect(response.status).toBe(200)
    })

    it("nao verifica a origem no OPTIONS", async () => {
        const response = await request(buildApp()).options("/acao").set("Origin", "https://atacante.example")

        expect(response.status).toBe(200)
    })

    it.each(["put", "patch", "delete"] as const)("verifica a origem no %s", async (method) => {
        const app = buildApp()

        const refused = await request(app)[method]("/acao").set("Origin", "https://atacante.example")
        const accepted = await request(app)[method]("/acao").set("Origin", FRONTEND_ORIGIN)

        expect(refused.status).toBe(403)
        expect(refused.body).toEqual(rejected)
        expect(accepted.status).toBe(200)
    })
})
