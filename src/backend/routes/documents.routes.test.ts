import express from "express"
import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import errorHandler from "../middleware/errorHandler.middleware"
import { DocumentsController } from "../controllers/documents.controller"
import { DocumentsStubRepository } from "../repositories/mock/documentsStub.repository"
import { DocumentsService } from "../services/documents.service"
import { DocumentsRoutes } from "./documents.routes"
import { createRequireAuth } from "../middleware/auth.middleware"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import { sessionTokens } from "../utils/sessionToken"

const ADMIN_ID = 1
const VIEWER_ID = 2
const authUsers = new MockAuthRepository([
    {
        id: ADMIN_ID,
        email: "admin@procon.test",
        passwordHash: "x",
        name: "Admin",
        isAdmin: true
    },
    {
        id: VIEWER_ID,
        email: "func@procon.test",
        passwordHash: "x",
        name: "Funcionario",
        permissions: ["appointments.view"]
    }
])

function cookieOf(userId: number): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion: 0 })}`
}

describe("DocumentsRoutes", () => {
    let app: express.Express
    let stubRepo: DocumentsStubRepository

    beforeEach(() => {
        stubRepo = new DocumentsStubRepository()
        const service = new DocumentsService(stubRepo)
        const controller = new DocumentsController(service)

        app = express()
        app.use(express.json())

        const routes = new DocumentsRoutes(
            controller,
            createRequireAuth({ users: authUsers, tokens: sessionTokens })
        )
        app.use("/api/v1/documents", routes.getRouter())
        app.use(errorHandler)
    })

    it("retorna 401 quando não autenticado", async () => {
        const res = await request(app).get("/api/v1/documents")
        expect(res.status).toBe(401)
    })

    it("retorna 403 quando não possui a permissão documents.configure", async () => {
        const res = await request(app)
            .get("/api/v1/documents")
            .set("Cookie", cookieOf(VIEWER_ID))
        expect(res.status).toBe(403)
    })

    it("retorna 200 com a lista de documentos e última alteração", async () => {
        const res = await request(app)
            .get("/api/v1/documents")
            .set("Cookie", cookieOf(ADMIN_ID))
        expect(res.status).toBe(200)
        expect(res.body.data.holder).toEqual(["RG", "CPF"])
        expect(res.body.data.representative).toEqual(["RG do titular", "Procuração"])
        expect(res.body.data.updatedBy).toEqual({ id: 1, name: "Admin" })
    })

    it("salva as alterações e atualiza a lista de documentos", async () => {
        const res = await request(app)
            .put("/api/v1/documents")
            .set("Cookie", cookieOf(ADMIN_ID))
            .send({
                holder: ["RG", "CPF", "Comprovante de residência"],
                representative: ["Procuração"]
            })

        expect(res.status).toBe(200)
        expect(res.body.data.holder).toEqual(["RG", "CPF", "Comprovante de residência"])
        expect(res.body.data.representative).toEqual(["Procuração"])
        expect(stubRepo.config.holder).toEqual(["RG", "CPF", "Comprovante de residência"])
    })

    it("retorna 400 se o corpo for inválido ao salvar", async () => {
        const res = await request(app)
            .put("/api/v1/documents")
            .set("Cookie", cookieOf(ADMIN_ID))
            .send({
                holder: [""],
                representative: []
            })

        expect(res.status).toBe(400)
    })

    it("gera a prévia da confirmação usando formatarConfirmacaoAgendamento", async () => {
        const res = await request(app)
            .post("/api/v1/documents/preview")
            .set("Cookie", cookieOf(ADMIN_ID))
            .send({
                byRepresentative: false,
                groupDocuments: ["RG", "CPF"],
                questionId: 1
            })

        expect(res.status).toBe(200)
        expect(res.body.data.text).toContain("Agendamento realizado")
        expect(res.body.data.text).toContain("Leve ao atendimento:")
        expect(res.body.data.text).toContain("• RG")
        expect(res.body.data.text).toContain("• CPF")
        expect(res.body.data.text).toContain("Documentos úteis para esta dúvida:")
        expect(res.body.data.text).toContain("• Doc P1")
    })
})
