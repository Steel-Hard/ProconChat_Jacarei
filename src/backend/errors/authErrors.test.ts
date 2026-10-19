import { describe, it, expect } from "vitest"
import ForbiddenError from "./ForbiddenError"
import TooManyRequestsError from "./TooManyRequestsError"
import InvalidOriginError from "./InvalidOriginError"
import InvalidCurrentPasswordError from "./InvalidCurrentPasswordError"

describe("erros da autenticacao", () => {
    it("cria o ForbiddenError com status 403 e codigo FORBIDDEN", () => {
        const error = new ForbiddenError("sem permissao")

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe("sem permissao")
        expect(error.statusCode).toBe(403)
        expect(error.code).toBe("FORBIDDEN")
    })

    it("cria o TooManyRequestsError com status 429, codigo TOO_MANY_REQUESTS e o tempo de espera", () => {
        const error = new TooManyRequestsError("muitas tentativas", 120)

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe("muitas tentativas")
        expect(error.statusCode).toBe(429)
        expect(error.code).toBe("TOO_MANY_REQUESTS")
        expect(error.retryAfterSeconds).toBe(120)
    })

    it("cria o InvalidOriginError com status 403 e codigo INVALID_ORIGIN", () => {
        const error = new InvalidOriginError("origem invalida")

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe("origem invalida")
        expect(error.statusCode).toBe(403)
        expect(error.code).toBe("INVALID_ORIGIN")
    })

    it("cria o InvalidCurrentPasswordError com status 400 e codigo INVALID_CURRENT_PASSWORD", () => {
        const error = new InvalidCurrentPasswordError("senha atual incorreta")

        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe("senha atual incorreta")
        expect(error.statusCode).toBe(400)
        expect(error.code).toBe("INVALID_CURRENT_PASSWORD")
    })
})
