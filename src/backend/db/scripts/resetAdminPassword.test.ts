import { PoolClient } from "pg"
import { describe, expect, it, vi } from "vitest"
import { PasswordHasher } from "../../utils/passwordHasher"
import { resetAdminPassword } from "./resetAdminPassword"

function fakeClient(adminExists: boolean) {
    const query = vi.fn(async (sql: string, _params?: unknown[]) => {
        if (sql.startsWith("SELECT")) {
            return { rowCount: adminExists ? 1 : 0, rows: adminExists ? [{ id: "1" }] : [] }
        }
        return { rowCount: 1, rows: [] }
    })
    return { client: { query } as unknown as PoolClient, query }
}

const hasher: PasswordHasher = {
    hash: vi.fn(async (password: string) => `hash:${password}`),
    compare: vi.fn(async () => true),
}

describe("resetAdminPassword", () => {
    it("grava o novo hash na conta Admin e incrementa a session_version", async () => {
        const { client, query } = fakeClient(true)

        await resetAdminPassword(client, { ROOT_PASSWORD: "nova-senha-ficticia" }, hasher)

        expect(query).toHaveBeenCalledTimes(2)
        expect(query.mock.calls[0]?.[0]).toMatch(/WHERE is_admin/)
        expect(query.mock.calls[1]?.[0]).toMatch(/SET password_hash = \$2, session_version = session_version \+ 1/)
        expect(query.mock.calls[1]?.[1]).toEqual(["1", "hash:nova-senha-ficticia"])
    })

    it("recusa a senha com menos de 8 caracteres sem tocar no banco", async () => {
        const { client, query } = fakeClient(true)

        await expect(resetAdminPassword(client, { ROOT_PASSWORD: "curta" }, hasher)).rejects.toThrow(/at least 8 characters/)
        expect(query).not.toHaveBeenCalled()
    })

    it("recusa a senha acima de 72 bytes sem tocar no banco", async () => {
        const { client, query } = fakeClient(true)

        await expect(resetAdminPassword(client, { ROOT_PASSWORD: "é".repeat(37) }, hasher)).rejects.toThrow(/72 bytes/)
        expect(query).not.toHaveBeenCalled()
    })

    it("falha sem ROOT_PASSWORD sem tocar no banco", async () => {
        const { client, query } = fakeClient(true)

        await expect(resetAdminPassword(client, {}, hasher)).rejects.toThrow(/ROOT_PASSWORD/)
        expect(query).not.toHaveBeenCalled()
    })

    it("falha orientando a rodar o seed quando nao existe Admin", async () => {
        const { client, query } = fakeClient(false)

        await expect(resetAdminPassword(client, { ROOT_PASSWORD: "nova-senha-ficticia" }, hasher)).rejects.toThrow(/seed/)
        expect(query).toHaveBeenCalledTimes(1)
    })
})
