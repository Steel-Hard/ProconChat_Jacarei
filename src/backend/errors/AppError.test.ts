import { describe, it, expect } from "vitest"
import BadRequestError from "./BadRequestError"
import NotFoundError from "./NotFoundError"
import InternalServerError from "./InternalServerError"

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
})
