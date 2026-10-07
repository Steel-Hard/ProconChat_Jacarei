import { describe, expect, it } from "vitest"
import express from "express"
import request from "supertest"
import { requirePermission } from "./permission.middleware"
import errorHandler from "./errorHandler.middleware"

describe("permission.middleware", () => {
  function createTestApp() {
    const app = express()
    app.use(express.json())

    app.get(
      "/test-view",
      requirePermission("appointments.view"),
      (_req, res) => {
        res.status(200).json({ ok: true })
      },
    )

    app.post(
      "/test-manage",
      requirePermission("appointments.manage"),
      (_req, res) => {
        res.status(200).json({ ok: true })
      },
    )

    app.use(errorHandler)
    return app
  }

  it("retorna 401 quando não há usuário nem cabeçalhos", async () => {
    const app = createTestApp()
    const response = await request(app).get("/test-view")

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe("UNAUTHORIZED")
    expect(response.body.error.message).toBe("Não autenticado")
  })

  it("permite acesso irrestrito para Admin (is_admin: true)", async () => {
    const app = createTestApp()
    const response = await request(app)
      .get("/test-view")
      .set("x-user-id", "1")
      .set("x-user-is-admin", "true")

    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)

    const manageResponse = await request(app)
      .post("/test-manage")
      .set("x-user-id", "1")
      .set("x-user-is-admin", "true")

    expect(manageResponse.status).toBe(200)
    expect(manageResponse.body.ok).toBe(true)
  })

  it("permite acesso quando usuário possui a permissão específica", async () => {
    const app = createTestApp()
    const response = await request(app)
      .get("/test-view")
      .set("x-user-id", "2")
      .set("x-user-is-admin", "false")
      .set("x-user-permissions", "appointments.view,reports.view")

    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
  })

  it("retorna 403 Forbidden quando usuário não é admin e não tem a permissão", async () => {
    const app = createTestApp()
    const response = await request(app)
      .post("/test-manage")
      .set("x-user-id", "2")
      .set("x-user-is-admin", "false")
      .set("x-user-permissions", "appointments.view")

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe("FORBIDDEN")
    expect(response.body.error.message).toBe("Permissão insuficiente")
  })
})
