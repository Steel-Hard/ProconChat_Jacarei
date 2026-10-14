import request from "supertest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { authRepository } from "../repositories/auth.repository"
import { bcryptPasswordHasher } from "../utils/passwordHasher"

vi.mock("../repositories/auth.repository", async () => {
    const { MockAuthRepository } = await import("../repositories/authMock.repository")
    const users = new MockAuthRepository([
        { id: 1, email: "admin@exemplo.test", passwordHash: "hash:senha-do-admin", name: "Admin", isAdmin: true },
        { id: 2, email: "inativa@exemplo.test", passwordHash: "hash:senha-da-inativa", active: false },
    ])
    return {
        authRepository: {
            findByEmail: vi.fn((email: string) => users.findByEmail(email)),
            findActiveById: vi.fn((id: number) => users.findActiveById(id)),
            findActiveWithPassword: vi.fn((id: number) => users.findActiveWithPassword(id)),
            findAdmin: vi.fn(() => users.findAdmin()),
            recordLogin: vi.fn((id: number) => users.recordLogin(id)),
            updatePassword: vi.fn((id: number, hash: string) => users.updatePassword(id, hash)),
        },
    }
})

vi.mock("../utils/passwordHasher", () => ({
    PASSWORD_HASH_COST: 12,
    bcryptPasswordHasher: {
        hash: vi.fn(async (password: string) => `hash:${password}`),
        compare: vi.fn(async (password: string, passwordHash: string) => passwordHash === `hash:${password}`),
    },
}))

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const FIVE_MINUTES = 5 * 60

let nextIp = 0
const freshIp = () => `198.51.100.${++nextIp}`

function login(ip: string, email: string, password: string, origin: string | null = ORIGIN) {
    const call = request(app).post("/api/v1/auth/login").set("X-Forwarded-For", ip)
    return (origin ? call.set("Origin", origin) : call).send({ email, password })
}

async function failTimes(times: number, ip: string, email: string) {
    for (let index = 0; index < times; index += 1) {
        const response = await login(ip, email, "senha-errada")
        expect(response.status).toBe(401)
    }
}

describe("limitador de login atras do proxy", () => {
    beforeEach(() => vi.clearAllMocks())

    test("bloqueia na 6a tentativa do mesmo IP e e-mail, com Retry-After, mesmo com a senha certa", async () => {
        const ip = freshIp()
        await failTimes(5, ip, "admin@exemplo.test")

        const blocked = await login(ip, "admin@exemplo.test", "senha-do-admin")

        expect(blocked.status).toBe(429)
        expect(blocked.body).toEqual({ error: { code: "TOO_MANY_REQUESTS", message: "Too many login attempts. Try again later" } })
        const retryAfter = Number(blocked.headers["retry-after"])
        expect(retryAfter).toBeGreaterThan(0)
        expect(retryAfter).toBeLessThanOrEqual(15 * 60)
        expect(authRepository.recordLogin).not.toHaveBeenCalled()
    })

    test("nao bloqueia quem chega por outro IP de cliente com o mesmo e-mail", async () => {
        const attacker = freshIp()
        const customer = freshIp()
        await failTimes(5, attacker, "admin@exemplo.test")

        const response = await login(customer, "admin@exemplo.test", "senha-do-admin")

        expect(response.status).toBe(200)
    })

    test("usa o IP do cliente que o Caddy anexou e nao um IP forjado no comeco da lista", async () => {
        const client = freshIp()
        await failTimes(5, client, "admin@exemplo.test")

        const forged = await login(`9.9.9.9, ${client}`, "admin@exemplo.test", "senha-do-admin")
        const otherClient = await login(`${client}, ${freshIp()}`, "admin@exemplo.test", "senha-do-admin")

        expect(forged.status).toBe(429)
        expect(otherClient.status).toBe(200)
    })

    test("bloqueia o IP com 20 falhas espalhadas em e-mails diferentes", async () => {
        const ip = freshIp()
        for (let index = 0; index < 20; index += 1) {
            await failTimes(1, ip, `pessoa${index}@exemplo.test`)
        }

        const blocked = await login(ip, "outra@exemplo.test", "senha-errada")

        expect(blocked.status).toBe(429)
        expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(FIVE_MINUTES)
    })

    test("nao bloqueia o IP com 19 falhas em e-mails diferentes", async () => {
        const ip = freshIp()
        for (let index = 0; index < 19; index += 1) {
            await failTimes(1, ip, `pessoa${index}@exemplo.test`)
        }

        const response = await login(ip, "admin@exemplo.test", "senha-do-admin")

        expect(response.status).toBe(200)
    })

    test("zera o contador do par quando o login da certo", async () => {
        const ip = freshIp()
        await failTimes(4, ip, "admin@exemplo.test")
        expect((await login(ip, "admin@exemplo.test", "senha-do-admin")).status).toBe(200)

        await failTimes(4, ip, "admin@exemplo.test")

        expect((await login(ip, "admin@exemplo.test", "senha-do-admin")).status).toBe(200)
    })

    test("a origem errada responde 403 antes do limitador e nao conta falha", async () => {
        const ip = freshIp()
        for (let index = 0; index < 10; index += 1) {
            const response = await login(ip, "admin@exemplo.test", "senha-errada", "https://atacante.example")
            expect(response.status).toBe(403)
        }
        const semOrigem = await login(ip, "admin@exemplo.test", "senha-errada", null)
        expect(semOrigem.status).toBe(403)
        expect(authRepository.findByEmail).not.toHaveBeenCalled()

        const response = await login(ip, "admin@exemplo.test", "senha-do-admin")

        expect(response.status).toBe(200)
    })

    test("a origem errada de um par bloqueado ainda responde 403 e nao 429", async () => {
        const ip = freshIp()
        await failTimes(5, ip, "admin@exemplo.test")

        const response = await login(ip, "admin@exemplo.test", "senha-do-admin", "https://atacante.example")

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe("INVALID_ORIGIN")
    })

    test("corpo invalido nao conta falha no limitador nem roda bcrypt", async () => {
        const ip = freshIp()
        for (let index = 0; index < 6; index += 1) {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .set("Origin", ORIGIN)
                .set("X-Forwarded-For", ip)
                .send({ email: "admin@exemplo.test" })
            expect(response.status).toBe(400)
        }

        const response = await login(ip, "admin@exemplo.test", "senha-do-admin")

        expect(response.status).toBe(200)
        expect(bcryptPasswordHasher.compare).toHaveBeenCalledTimes(1)
    })

    test("roda a comparacao bcrypt e responde igual para e-mail inexistente, senha errada e conta inativa", async () => {
        const unknown = await login(freshIp(), "ninguem@exemplo.test", "qualquer-senha")
        const wrong = await login(freshIp(), "admin@exemplo.test", "senha-errada")
        const inactive = await login(freshIp(), "inativa@exemplo.test", "senha-da-inativa")

        expect(bcryptPasswordHasher.compare).toHaveBeenCalledTimes(3)
        for (const response of [unknown, wrong, inactive]) {
            expect(response.status).toBe(401)
            expect(response.body).toEqual(unknown.body)
            expect(response.headers["set-cookie"]).toBeUndefined()
        }
    })
})
