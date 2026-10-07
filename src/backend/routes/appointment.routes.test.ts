import { beforeEach, describe, expect, it } from "vitest"
import express from "express"
import request from "supertest"
import { MockAppointmentRepository } from "../repositories/appointmentMock.repository"
import { createAppointmentRoutes } from "./appointment.routes"
import errorHandler from "../middleware/errorHandler.middleware"

describe("appointment.routes (HTTP)", () => {
  let app: express.Express
  let repository: MockAppointmentRepository

  beforeEach(() => {
    repository = new MockAppointmentRepository(true)
    app = express()
    app.use(express.json())
    app.use("/api/v1/appointments", createAppointmentRoutes(repository))
    app.use(errorHandler)
  })

  describe("Autenticação e Permissões", () => {
    it("retorna 401 em todas as rotas se não estiver autenticado", async () => {
      const getRes = await request(app).get("/api/v1/appointments")
      expect(getRes.status).toBe(401)

      const countRes = await request(app).get("/api/v1/appointments/pending-count")
      expect(countRes.status).toBe(401)

      const patchRes = await request(app)
        .patch("/api/v1/appointments/1/status")
        .send({ action: "claim" })
      expect(patchRes.status).toBe(401)
    })

    it("retorna 403 em ações de gerenciar para usuário que só tem permissão de visualização", async () => {
      const patchRes = await request(app)
        .patch("/api/v1/appointments/1/status")
        .set("x-user-id", "5")
        .set("x-user-permissions", "appointments.view")
        .send({ action: "claim" })

      expect(patchRes.status).toBe(403)
      expect(patchRes.body.error.message).toBe("Permissão insuficiente")
    })

    it("permite GET para usuário com appointments.view", async () => {
      const res = await request(app)
        .get("/api/v1/appointments")
        .set("x-user-id", "5")
        .set("x-user-permissions", "appointments.view")

      expect(res.status).toBe(200)
      expect(res.body.data).toBeInstanceOf(Array)
    })

    it("permite todas as ações para usuário Admin", async () => {
      const res = await request(app)
        .get("/api/v1/appointments")
        .set("x-user-id", "1")
        .set("x-user-is-admin", "true")

      expect(res.status).toBe(200)

      const patchRes = await request(app)
        .patch("/api/v1/appointments/1/status")
        .set("x-user-id", "1")
        .set("x-user-is-admin", "true")
        .send({ action: "claim" })

      expect(patchRes.status).toBe(200)
      expect(patchRes.body.data.status).toBe("CONFIRMED")
    })
  })

  describe("GET /api/v1/appointments/pending-count", () => {
    it("retorna o contador de pendentes", async () => {
      const res = await request(app)
        .get("/api/v1/appointments/pending-count")
        .set("x-user-id", "1")
        .set("x-user-is-admin", "true")

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveProperty("count")
      expect(typeof res.body.data.count).toBe("number")
    })
  })

  describe("GET /api/v1/appointments", () => {
    it("retorna listagem com paginação e chipCounts (padrão período próximos)", async () => {
      const res = await request(app)
        .get("/api/v1/appointments?page=1&limit=20")
        .set("x-user-id", "1")
        .set("x-user-is-admin", "true")

      expect(res.status).toBe(200)
      expect(res.body.data).toBeInstanceOf(Array)
      expect(res.body.total).toBe(6) // 6 agendamentos futuros ou de hoje
      expect(res.body.chipCounts).toBeDefined()
      expect(res.body.chipCounts.all).toBe(9) // contagem total de chips
    })

    it("retorna todos os agendamentos quando period=all", async () => {
      const res = await request(app)
        .get("/api/v1/appointments?period=all")
        .set("x-user-id", "1")
        .set("x-user-is-admin", "true")

      expect(res.status).toBe(200)
      expect(res.body.total).toBe(9)
    })

    it("filtra por status PENDING", async () => {
      const res = await request(app)
        .get("/api/v1/appointments?status=PENDING")
        .set("x-user-id", "1")
        .set("x-user-is-admin", "true")

      expect(res.status).toBe(200)
      expect(
        res.body.data.every((a: { status: string }) => a.status === "PENDING"),
      ).toBe(true)
    })

    it("retorna 400 se enviar query param inválido pelo schema Zod", async () => {
      const res = await request(app)
        .get("/api/v1/appointments?status=STATUS_INEXISTENTE")
        .set("x-user-id", "1")
        .set("x-user-is-admin", "true")

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe("BAD_REQUEST")
    })
  })

  describe("GET /api/v1/appointments/:id", () => {
    it("retorna detalhe completo do agendamento", async () => {
      const res = await request(app)
        .get("/api/v1/appointments/1")
        .set("x-user-id", "1")
        .set("x-user-is-admin", "true")

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe("1")
      expect(res.body.data.name).toBe("Maria Silva")
      expect(res.body.data.documents_sent).toBeDefined()
      expect(res.body.data.events).toBeInstanceOf(Array)
      expect(res.body.data.timeline).toBeInstanceOf(Array)
    })

    it("retorna 404 para ID inexistente", async () => {
      const res = await request(app)
        .get("/api/v1/appointments/9999")
        .set("x-user-id", "1")
        .set("x-user-is-admin", "true")

      expect(res.status).toBe(404)
    })
  })

  describe("Ações de Status (PATCH e POST)", () => {
    it("executa ação claim via PATCH /status", async () => {
      const res = await request(app)
        .patch("/api/v1/appointments/1/status")
        .set("x-user-id", "10")
        .set("x-user-permissions", "appointments.manage")
        .send({ action: "claim" })

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe("CONFIRMED")
      expect(res.body.data.assigned_user_id).toBe("10")
    })

    it("executa ação claim via POST /claim e POST /assumir", async () => {
      const res = await request(app)
        .post("/api/v1/appointments/7/claim")
        .set("x-user-id", "10")
        .set("x-user-permissions", "appointments.manage")

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe("CONFIRMED")

      const resAssumir = await request(app)
        .post("/api/v1/appointments/8/assumir")
        .set("x-user-id", "10")
        .set("x-user-permissions", "appointments.manage")

      expect(resAssumir.status).toBe(200)
      expect(res.body.data.status).toBe("CONFIRMED")
    })

    it("executa ação attended com sucesso para agendamento de hoje", async () => {
      const res = await request(app)
        .post("/api/v1/appointments/7/attended")
        .set("x-user-id", "10")
        .set("x-user-permissions", "appointments.manage")

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe("ATTENDED")
    })

    it("retorna 400 ao tentar marcar attended para agendamento futuro", async () => {
      // ID 1 é amanhã
      const res = await request(app)
        .post("/api/v1/appointments/1/attended")
        .set("x-user-id", "10")
        .set("x-user-permissions", "appointments.manage")

      expect(res.status).toBe(400)
      expect(res.body.error.message).toBe("Disponível a partir do dia do atendimento")
    })

    it("retorna 400 com body inválido no PATCH /status", async () => {
      const res = await request(app)
        .patch("/api/v1/appointments/1/status")
        .set("x-user-id", "1")
        .set("x-user-is-admin", "true")
        .send({ action: "invalido" })

      expect(res.status).toBe(400)
    })
  })
})
