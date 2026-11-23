import { describe, it, expect } from "vitest"
import BadRequestError from "./BadRequestError"
import NotFoundError from "./NotFoundError"
import InternalServerError from "./InternalServerError"
import ConflictError from "./ConflictError"

describe("AppError subclasses", () => {
    it("creates a BadRequestError with statusCode 400 and code BAD_REQUEST", () => {
        const error = new BadRequestError("invalid input")

        expect(error).toBeInstanceOf(Error)
        expect(error.name).toBe("BadRequestError")
        expect(error.message).toBe("invalid input")
        expect(error.statusCode).toBe(400)
        expect(error.code).toBe("BAD_REQUEST")
    })

    it("creates a NotFoundError with statusCode 404 and code NOT_FOUND", () => {
        const error = new NotFoundError("resource not found")

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe("resource not found")
        expect(error.statusCode).toBe(404)
        expect(error.code).toBe("NOT_FOUND")
    })

    it("creates an InternalServerError with statusCode 500 and code INTERNAL_SERVER_ERROR", () => {
        const error = new InternalServerError("something went wrong")

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe("something went wrong")
        expect(error.statusCode).toBe(500)
        expect(error.code).toBe("INTERNAL_SERVER_ERROR")
    })

    it("creates a ConflictError with statusCode 409 and code CONFLICT", () => {
        const error = new ConflictError("conflict detected")

        expect(error).toBeInstanceOf(Error)
        expect(error.name).toBe("ConflictError")
        expect(error.message).toBe("conflict detected")
        expect(error.statusCode).toBe(409)
        expect(error.code).toBe("CONFLICT")
    })

    it("cria o erro sem details quando ele nao e informado", () => {
        const error = new ConflictError("conflito", "EMAIL_ALREADY_IN_USE")

        expect(error.details).toBeUndefined()
    })

    it("guarda o details do ConflictError com o codigo informado", () => {
        const error = new ConflictError("sem responsavel", "REASSIGNMENT_REQUIRED", { userId: 9 })

        expect(error.statusCode).toBe(409)
        expect(error.code).toBe("REASSIGNMENT_REQUIRED")
        expect(error.details).toEqual({ userId: 9 })
    })

    it("guarda o details do NotFoundError mantendo o codigo NOT_FOUND", () => {
        const error = new NotFoundError("conta nao encontrada", { userId: 42 })

        expect(error.statusCode).toBe(404)
        expect(error.code).toBe("NOT_FOUND")
        expect(error.details).toEqual({ userId: 42 })
    })
})
