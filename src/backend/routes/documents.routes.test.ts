import express from "express"
import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import errorHandler from "../middleware/errorHandler.middleware"
import { DocumentsController } from "../controllers/documents.controller"
import { DocumentsStubRepository } from "../repositories/mock/documentsStub.repository"
import { createDocumentsService } from "../services/documents.service"
import { formatarConfirmacaoAgendamento } from "../services/messageFormatter.service"
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
        const service = createDocumentsService({ documents: stubRepo })
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

    describe("prévia estruturada", () => {
        function preview(body: object) {
            return request(app)
                .post("/api/v1/documents/preview")
                .set("Cookie", cookieOf(ADMIN_ID))
                .send(body)
        }

        it("devolve a confirmação em blocos e o mesmo texto que o bot envia", async () => {
            stubRepo.sampleQuestions = [
                { id: "1", title: "Pergunta 1", categoryTitle: "Cat", documents: ["RG", "Nota fiscal"] }
            ]
            const groupDocuments = ["RG ou outro documento oficial com foto", "CPF"]

            const res = await preview({ byRepresentative: false, groupDocuments, questionId: 1 })

            expect(res.status).toBe(200)
            expect(res.body.data.text).toBe(
                formatarConfirmacaoAgendamento({
                    protocol: "A3F9C21B",
                    quando: "Ter, 10/11 às 14:00",
                    unitAddress: stubRepo.scheduleContext.unitAddress,
                    unitAddressComplement: stubRepo.scheduleContext.unitAddressComplement,
                    byRepresentative: false,
                    groupDocuments,
                    questionDocuments: ["RG", "Nota fiscal"],
                    reminderEnabled: stubRepo.scheduleContext.reminderEnabled,
                    reminderHours: stubRepo.scheduleContext.reminderHours
                })
            )
            expect(res.body.data.example).toEqual({
                protocol: "A3F9C21B",
                dateTime: "Ter, 10/11 às 14:00"
            })
            expect(res.body.data.title).toBe("Agendamento realizado")
            expect(res.body.data.details).toEqual([
                { label: "Protocolo", value: "A3F9C21B" },
                { label: "Data e hora", value: "Ter, 10/11 às 14:00" },
                { label: "Endereço", value: "Rua Central, 100" }
            ])
            expect(res.body.data.groupBlock).toEqual({
                heading: "Leve ao atendimento:",
                items: [
                    { text: "RG ou outro documento oficial com foto", repeated: true },
                    { text: "CPF", repeated: false }
                ]
            })
            expect(res.body.data.questionBlock.items).toEqual([
                { text: "RG", repeated: true },
                { text: "Nota fiscal", repeated: false }
            ])
            expect(res.body.data.repeatedCount).toBe(1)
        })

        it("aceita questionId numérico em texto e omitido", async () => {
            const comTexto = await preview({ byRepresentative: false, groupDocuments: [], questionId: "1" })
            const semPergunta = await preview({ byRepresentative: false, groupDocuments: [] })

            expect(comTexto.status).toBe(200)
            expect(comTexto.body.data.questionBlock.items).toEqual([
                { text: "Doc P1", repeated: false }
            ])
            expect(semPergunta.status).toBe(200)
            expect(semPergunta.body.data.questionBlock).toBeNull()
        })

        it.each([["abc"], [0], [-3], [1.5], [""]])(
            "recusa questionId inválido (%s) com 400 e mensagem em português",
            async (questionId) => {
                const res = await preview({ byRepresentative: false, groupDocuments: [], questionId })

                expect(res.status).toBe(400)
                expect(res.body.error.message).toContain("questionId: Pergunta inválida.")
            }
        )

        it.each([["99999999999999999999"], [1e21]])(
            "recusa questionId acima do limite (%s) com 400 em vez de 500",
            async (questionId) => {
                const res = await preview({ byRepresentative: false, groupDocuments: [], questionId })

                expect(res.status).toBe(400)
                expect(res.body.error.message).toContain("Pergunta inválida.")
            }
        )

        it("devolve 404 quando a pergunta não existe ou está inativa", async () => {
            const res = await preview({ byRepresentative: false, groupDocuments: [], questionId: 999 })

            expect(res.status).toBe(404)
        })
    })

    describe("limites e duplicados da lista", () => {
        function save(body: object) {
            return request(app).put("/api/v1/documents").set("Cookie", cookieOf(ADMIN_ID)).send(body)
        }

        function items(count: number): string[] {
            return Array.from({ length: count }, (_, index) => `Documento ${index + 1}`)
        }

        it("aceita 10 itens por grupo e recusa o 11º com mensagem do limite", async () => {
            const aceito = await save({ holder: items(10), representative: items(10) })
            const recusado = await save({ holder: items(11), representative: [] })

            expect(aceito.status).toBe(200)
            expect(recusado.status).toBe(400)
            expect(recusado.body.error.message).toContain("Limite de 10 documentos por grupo")
        })

        it("recusa item repetido no mesmo grupo ignorando acento e maiúscula, citando o item", async () => {
            const res = await save({
                holder: ["Cédula de identidade", "CPF", "cedula de identidade"],
                representative: []
            })

            expect(res.status).toBe(400)
            expect(res.body.error.message).toContain("holder.2")
            expect(res.body.error.message).toContain("cedula de identidade")
            expect(res.body.error.message).toContain("já está na lista")
        })

        it("aceita o mesmo documento em grupos diferentes e documento contido no outro", async () => {
            const res = await save({
                holder: ["RG", "RG ou outro documento oficial com foto"],
                representative: ["RG"]
            })

            expect(res.status).toBe(200)
        })

        it("aplica os mesmos limites à prévia", async () => {
            const res = await request(app)
                .post("/api/v1/documents/preview")
                .set("Cookie", cookieOf(ADMIN_ID))
                .send({ byRepresentative: false, groupDocuments: ["CPF", "cpf"] })

            expect(res.status).toBe(400)
        })

        it("recusa item com mais de 255 caracteres e aceita com 255", async () => {
            const aceito = await save({ holder: ["a".repeat(255)], representative: [] })
            const recusado = await save({ holder: ["a".repeat(256)], representative: [] })

            expect(aceito.status).toBe(200)
            expect(recusado.status).toBe(400)
            expect(recusado.body.error.message).toContain("holder.0")
            expect(recusado.body.error.message).toContain(
                `O documento "${"a".repeat(30)}…" passa de 255 caracteres.`
            )
            expect(recusado.body.error.message).not.toContain("Too big")
        })

        it("recusa item vazio ou só com espaços com mensagem em português", async () => {
            const res = await save({ holder: ["CPF", "   "], representative: [] })

            expect(res.status).toBe(400)
            expect(res.body.error.message).toContain("holder.1")
            expect(res.body.error.message).toContain("Há um documento vazio na lista.")
            expect(res.body.error.message).not.toContain("Too small")
        })
    })
})
