import jwt from "jsonwebtoken"
import { describe, expect, it } from "vitest"
import { ACCESS_TOKEN_TTL_SECONDS, createSessionTokens } from "./sessionToken"

const SECRET = "test-only-auth-token-secret-with-32-chars"
const START = Date.UTC(2030, 0, 1, 12, 0, 0)

function setup() {
    let current = START
    const tokens = createSessionTokens({ secret: () => SECRET, now: () => current })
    const advance = (ms: number) => {
        current += ms
    }
    return { tokens, advance }
}

const claims = { userId: 7, sessionVersion: 3 }
const refreshExpiresAt = new Date(START + 90 * 24 * 60 * 60 * 1000)

function forge(payload: object): string {
    return jwt.sign(payload, SECRET, { algorithm: "HS256" })
}

describe("createSessionTokens", () => {
    it("aceita o token de acesso que acabou de emitir", () => {
        const { tokens } = setup()

        const token = tokens.signAccessToken(claims)

        expect(tokens.verifyAccessToken(token)).toEqual(claims)
    })

    it("aceita o token de refresh que acabou de emitir", () => {
        const { tokens } = setup()

        const token = tokens.signRefreshToken({ ...claims, expiresAt: refreshExpiresAt })

        expect(tokens.verifyRefreshToken(token)).toEqual(claims)
    })

    it("recusa o token de refresh como acesso", () => {
        const { tokens } = setup()

        const token = tokens.signRefreshToken({ ...claims, expiresAt: refreshExpiresAt })

        expect(tokens.verifyAccessToken(token)).toBeNull()
    })

    it("recusa o token de acesso como refresh", () => {
        const { tokens } = setup()

        const token = tokens.signAccessToken(claims)

        expect(tokens.verifyRefreshToken(token)).toBeNull()
    })

    it("recusa o token de acesso depois de 1 hora", () => {
        const { tokens, advance } = setup()
        const token = tokens.signAccessToken(claims)

        advance(ACCESS_TOKEN_TTL_SECONDS * 1000 - 1000)
        expect(tokens.verifyAccessToken(token)).toEqual(claims)
        advance(1000)
        expect(tokens.verifyAccessToken(token)).toBeNull()
    })

    it("grava no refresh o exp igual ao vencimento informado", () => {
        const { tokens, advance } = setup()
        const token = tokens.signRefreshToken({ ...claims, expiresAt: refreshExpiresAt })

        expect(jwt.decode(token)).toMatchObject({ exp: refreshExpiresAt.getTime() / 1000, typ: "refresh", sub: "7" })
        advance(refreshExpiresAt.getTime() - START)
        expect(tokens.verifyRefreshToken(token)).toBeNull()
    })

    it("recusa o token adulterado", () => {
        const { tokens } = setup()
        const [header, , signature] = tokens.signAccessToken(claims).split(".")
        const payload = Buffer.from(JSON.stringify({ sub: "1", sessionVersion: 0, typ: "access", exp: START / 1000 + 60 })).toString("base64url")

        expect(tokens.verifyAccessToken(`${header}.${payload}.${signature}`)).toBeNull()
    })

    it("recusa o token assinado com outro segredo", () => {
        const { tokens } = setup()
        const token = jwt.sign({ sub: "7", sessionVersion: 3, typ: "access" }, "outro-segredo-de-teste-com-32-caracteres", { algorithm: "HS256" })

        expect(tokens.verifyAccessToken(token)).toBeNull()
    })

    it("recusa o token com sub nao numerico", () => {
        const { tokens } = setup()

        const token = forge({ sub: "admin", sessionVersion: 0, typ: "access", iat: START / 1000, exp: START / 1000 + 60 })

        expect(tokens.verifyAccessToken(token)).toBeNull()
    })

    it("recusa o token com sessionVersion nao inteiro", () => {
        const { tokens } = setup()

        const token = forge({ sub: "7", sessionVersion: "3", typ: "access", iat: START / 1000, exp: START / 1000 + 60 })

        expect(tokens.verifyAccessToken(token)).toBeNull()
    })

    it("recusa o token sem typ", () => {
        const { tokens } = setup()

        const token = forge({ sub: "7", sessionVersion: 3, iat: START / 1000, exp: START / 1000 + 60 })

        expect(tokens.verifyAccessToken(token)).toBeNull()
    })
})
