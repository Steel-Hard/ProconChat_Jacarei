import { NextFunction, Request, Response } from "express"
import { describe, expect, it, vi } from "vitest"
import ContentController from "./content.controller"
import UnauthorizedError from "../errors/UnauthorizedError"
import { ContentStubRepository } from "../repositories/mock/contentStub.repository"
import { ContentService } from "../services/content.service"

function createMockResponse(): Response {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    }
    return res as unknown as Response
}

describe("ContentController", () => {
    it("delegates category and question operations to ContentService and returns 200/201", async () => {
        const repository = new ContentStubRepository()
        const service = new ContentService({ repository })
        const controller = new ContentController({ service })

        const authUser = {
            id: 7,
            name: "Admin",
            email: "admin@procon.sp.gov.br",
            isAdmin: true,
            permissions: ["content.manage"] as const,
            sessionVersion: 0,
        }

        const createCatRes = createMockResponse()
        const next: NextFunction = vi.fn()
        await controller.createCategory(
            {
                authUser,
                body: {
                    title: "Compras e Garantias",
                    shortTitle: "Compras e garantia",
                    description: "Descrição",
                },
            } as unknown as Request,
            createCatRes,
            next,
        )
        expect(createCatRes.status).toHaveBeenCalledWith(201)

        const listCatRes = createMockResponse()
        await controller.listCategories({} as Request, listCatRes, next)
        expect(listCatRes.status).toHaveBeenCalledWith(200)

        const createQRes = createMockResponse()
        await controller.createQuestion(
            {
                authUser,
                body: {
                    categoryId: 1,
                    shortTitle: "Defeito",
                    shortDescription: null,
                    question: "Pergunta?",
                    answer: "Resposta.",
                    legalBasis: null,
                    requiredDocuments: [],
                    requiresInPerson: false,
                    inPersonNote: null,
                    outOfScope: false,
                    llmAllowed: true,
                    active: true,
                },
            } as unknown as Request,
            createQRes,
            next,
        )
        expect(createQRes.status).toHaveBeenCalledWith(201)
    })

    it("forwards UnauthorizedError to next when req.authUser is missing on write operations", async () => {
        const controller = new ContentController({
            service: new ContentService({ repository: new ContentStubRepository() }),
        })
        const res = createMockResponse()
        const next = vi.fn()

        await controller.createCategory(
            { body: { title: "A", shortTitle: "A", description: null } } as unknown as Request,
            res,
            next,
        )

        expect(next).toHaveBeenCalledTimes(1)
        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError)
    })
})
