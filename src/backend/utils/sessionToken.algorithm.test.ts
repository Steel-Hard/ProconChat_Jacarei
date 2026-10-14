import jwt from "jsonwebtoken"
import { describe, expect, it } from "vitest"
import { createSessionTokens } from "./sessionToken"

const SECRET = "test-only-auth-token-secret-with-32-chars"
const NOW = Date.UTC(2030, 0, 1, 12, 0, 0)

function forged(algorithm: jwt.Algorithm, typ: "access" | "refresh"): string {
    const exp = Math.floor(NOW / 1000) + 3600
    return jwt.sign({ sub: "7", sessionVersion: 1, typ, iat: Math.floor(NOW / 1000), exp }, SECRET, { algorithm })
}

describe("algoritmo dos tokens de sessao", () => {
    const tokens = createSessionTokens({ secret: () => SECRET, now: () => NOW })

    it("recusa o token de acesso assinado com HS512 mesmo com o segredo certo", () => {
        expect(tokens.verifyAccessToken(forged("HS512", "access"))).toBeNull()
    })

    it("recusa o token de refresh assinado com HS384 mesmo com o segredo certo", () => {
        expect(tokens.verifyRefreshToken(forged("HS384", "refresh"))).toBeNull()
    })

    it("aceita o mesmo conteudo assinado com HS256", () => {
        expect(tokens.verifyAccessToken(forged("HS256", "access"))).toEqual({ userId: 7, sessionVersion: 1 })
    })
})
