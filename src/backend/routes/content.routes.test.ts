import express, { NextFunction, Request, Response } from "express"
import request from "supertest"
import { describe, expect, it } from "vitest"
import errorHandler from "../middleware/errorHandler.middleware"
import { ContentStubRepository } from "../repositories/mock/contentStub.repository"
import { ContentRoutes } from "./content.routes"
import { ContentService } from "../services/content.service"
import { AuthenticatedUser } from "../types/auth.types"

function buildApp(user?: AuthenticatedUser) {
    const repository = new ContentStubRepository()
    const service = new ContentService({ repository })
    const routes = new ContentRoutes({
        service,
        authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
            if (user) {
                req.authUser = user
            }
            next()
        },
    })

    const app = express()
    app.use(express.json())
    app.use("/api/v1/content", routes.getRouter())
    app.use(errorHandler)
    return app
}

const contentManagerUser: AuthenticatedUser = {
    id: 5,
    name: "Editora de Conteúdo",
    email: "conteudo@procon.sp.gov.br",
    isAdmin: false,
    permissions: ["content.manage"],
    sessionVersion: 1,
}

const noPermissionUser: AuthenticatedUser = {
    id: 6,
    name: "Leitor de Relatórios",
    email: "relatorios@procon.sp.gov.br",
    isAdmin: false,
    permissions: ["reports.view"],
    sessionVersion: 1,
}

describe("content.routes", () => {
    it("enforces authentication and content.manage permission and sets Cache-Control: no-store", async () => {
        const unauthApp = buildApp(undefined)
        const unauthRes = await request(unauthApp).get("/api/v1/content/categories")
        expect(unauthRes.status).toBe(401)
        expect(unauthRes.headers["cache-control"]).toBe("no-store")

        const forbiddenApp = buildApp(noPermissionUser)
        const forbiddenRes = await request(forbiddenApp).get("/api/v1/content/categories")
        expect(forbiddenRes.status).toBe(403)
    })

    it("supports full category and question CRUD, search, reorder, preview, and field validation issues", async () => {
        const app = buildApp(contentManagerUser)

        const createCatRes = await request(app)
            .post("/api/v1/content/categories")
            .send({
                title: "Compras e Garantias",
                shortTitle: "Compras e garantia",
                description: "Produtos com defeito e trocas",
            })
        expect(createCatRes.status).toBe(201)
        expect(createCatRes.body.data.hiddenInChatbot).toBe(true)

        const duplicateCatRes = await request(app)
            .post("/api/v1/content/categories")
            .send({
                title: "compras e garantias",
                shortTitle: "Outro título",
            })
        expect(duplicateCatRes.status).toBe(409)
        expect(duplicateCatRes.body.error.code).toBe("CATEGORY_TITLE_CONFLICT")

        const invalidQuestionRes = await request(app)
            .post("/api/v1/content/questions")
            .send({
                categoryId: 1,
                shortTitle: "Título válido",
                question: "Pergunta?",
                answer: "Resposta.",
                requiresInPerson: true,
                outOfScope: true,
            })
        expect(invalidQuestionRes.status).toBe(400)
        expect(invalidQuestionRes.body.error.details.issues).toEqual([
            {
                path: "outOfScope",
                message:
                    "Exige atendimento presencial e Fora do escopo do PROCON são mutuamente exclusivos",
            },
        ])

        const createQRes = await request(app)
            .post("/api/v1/content/questions")
            .send({
                categoryId: 1,
                shortTitle: "Produto com defeito",
                shortDescription: "Prazo de 30 dias",
                question: "Comprei um produto com defeito, o que fazer?",
                answer: "O fornecedor tem até 30 dias para reparar o produto.",
                legalBasis: "Art. 18 do CDC",
                requiredDocuments: ["Nota fiscal", "RG ou CNH"],
                requiresInPerson: false,
                outOfScope: false,
                llmAllowed: true,
            })
        expect(createQRes.status).toBe(201)
        expect(createQRes.body.data.whatsappPage).toBe(1)

        const listByCatRes = await request(app).get("/api/v1/content/categories/1/questions")
        expect(listByCatRes.status).toBe(200)
        expect(listByCatRes.body.data).toHaveLength(1)

        const searchRes = await request(app)
            .get("/api/v1/content/questions")
            .query({ search: "reparar" })
        expect(searchRes.status).toBe(200)
        expect(searchRes.body.data).toHaveLength(1)
        expect(searchRes.body.data[0].categoryTitle).toBe("Compras e Garantias")

        const previewRes = await request(app)
            .post("/api/v1/content/questions/preview")
            .send({
                questionId: 1,
                categoryId: 1,
                shortTitle: "Produto com defeito",
                shortDescription: "Prazo de 30 dias",
                question: "Comprei um produto com defeito, o que fazer?",
                answer: "O fornecedor tem até 30 dias para reparar o produto.",
                legalBasis: "Art. 18 do CDC",
                requiredDocuments: ["Nota fiscal"],
                requiresInPerson: false,
                outOfScope: false,
                llmAllowed: true,
            })
        expect(previewRes.status).toBe(200)
        expect(previewRes.body.data.answerBubble.aiSampleLabel).toBe("Gerado com auxílio de IA")
        expect(previewRes.body.data.nextStepBubble.type).toBe("resolution")
    })
})
