import { PoolClient } from "pg"
import { describe, expect, it, vi } from "vitest"
import { seedAdminAccount } from "./admin.seed"
import { PasswordHasher } from "../../utils/passwordHasher"

function fakeClient(adminExists: boolean) {
    const query = vi.fn(async (sql: string, _params?: unknown[]) => {
        if (sql.startsWith("SELECT")) {
            return { rowCount: adminExists ? 1 : 0, rows: adminExists ? [{ id: 1 }] : [] }
        }
        return { rowCount: 1, rows: [] }
    })
    return { client: { query } as unknown as PoolClient, query }
}

const hasher: PasswordHasher = {
    hash: vi.fn(async (password: string) => `hash:${password}`),
    compare: vi.fn(async () => true),
}

describe("seedAdminAccount", () => {
    it("cria a conta Admin quando ela nao existe", async () => {
        const { client, query } = fakeClient(false)

        const outcome = await seedAdminAccount(client, { ROOT_EMAIL: "admin@exemplo.test", ROOT_PASSWORD: "senha-ficticia" }, hasher)

        expect(outcome).toBe("created")
        expect(query).toHaveBeenCalledTimes(2)
        expect(query.mock.calls[0]?.[0]).toMatch(/WHERE is_admin/)
        expect(query.mock.calls[1]?.[0]).toMatch(/INSERT INTO Users/)
        expect(query.mock.calls[1]?.[0]).toMatch(/'Admin'/)
        expect(query.mock.calls[1]?.[1]).toEqual(["admin@exemplo.test", "hash:senha-ficticia"])
    })

    it("mantem a conta Admin existente sem ler as variaveis", async () => {
        const { client, query } = fakeClient(true)
        const env = new Proxy({}, { get: () => { throw new Error("leu a variavel") } })

        const outcome = await seedAdminAccount(client, env, hasher)

        expect(outcome).toBe("kept")
        expect(query).toHaveBeenCalledTimes(1)
    })

    it("falha sem gravar quando falta ROOT_EMAIL", async () => {
        const { client, query } = fakeClient(false)

        await expect(seedAdminAccount(client, { ROOT_PASSWORD: "senha-ficticia" }, hasher)).rejects.toThrow(/ROOT_EMAIL/)
        expect(query).toHaveBeenCalledTimes(1)
    })

    it("falha sem gravar quando falta ROOT_PASSWORD", async () => {
        const { client, query } = fakeClient(false)

        await expect(seedAdminAccount(client, { ROOT_EMAIL: "admin@exemplo.test" }, hasher)).rejects.toThrow(/ROOT_PASSWORD/)
        expect(query).toHaveBeenCalledTimes(1)
    })

    it("falha sem gravar quando ROOT_PASSWORD nao segue a politica de senha", async () => {
        const { client, query } = fakeClient(false)

        await expect(
            seedAdminAccount(client, { ROOT_EMAIL: "admin@exemplo.test", ROOT_PASSWORD: "curta" }, hasher),
        ).rejects.toThrow(/ROOT_PASSWORD.*at least 8 characters/)
        expect(query).toHaveBeenCalledTimes(1)
    })

    it("normaliza o e-mail sem espacos nas pontas e em minusculas", async () => {
        const { client, query } = fakeClient(false)

        await seedAdminAccount(client, { ROOT_EMAIL: "  Admin@Exemplo.TEST ", ROOT_PASSWORD: "senha-ficticia" }, hasher)

        expect(query.mock.calls[1]?.[1]).toEqual(["admin@exemplo.test", "hash:senha-ficticia"])
    })
})
