import { describe, it, expect } from "vitest"
import BadRequestError from "./BadRequestError"
import NotFoundError from "./NotFoundError"
import InternalServerError from "./InternalServerError"
import ForbiddenError from "./ForbiddenError"
import PayloadTooLargeError from "./PayloadTooLargeError"

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

    it("creates a ForbiddenError with statusCode 403 and code FORBIDDEN", () => {
        const error = new ForbiddenError("forbidden")

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe("forbidden")
        expect(error.statusCode).toBe(403)
        expect(error.code).toBe("FORBIDDEN")
    })

    it("creates a PayloadTooLargeError with statusCode 413 and code PAYLOAD_TOO_LARGE", () => {
        const error = new PayloadTooLargeError("too large")

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe("too large")
        expect(error.statusCode).toBe(413)
        expect(error.code).toBe("PAYLOAD_TOO_LARGE")
    })
})
