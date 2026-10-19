import { PoolClient } from "pg"
import { describe, expect, it, vi } from "vitest"
import { seedWhatsAppSettings } from "./whatsappSettings.seed"

function fakeClient(rowExists: boolean) {
    const query = vi.fn(async (sql: string) => {
        if (sql.startsWith("SELECT")) {
            return { rowCount: rowExists ? 1 : 0, rows: rowExists ? [{ id: 1 }] : [] }
        }
        return { rowCount: 1, rows: [] }
    })
    return { client: { query } as unknown as PoolClient, query }
}

const fakeEncrypt = vi.fn((value: string) => `v1:iv:tag:${Buffer.from(value).toString("base64")}`)

const fullEnv = {
    WHATSAPP_PHONE_NUMBER_ID: "100000000000001",
    WHATSAPP_BUSINESS_ACCOUNT_ID: "200000000000002",
    WHATSAPP_ACCESS_TOKEN: "token-ficticio-de-acesso",
    WHATSAPP_APP_SECRET: "segredo-ficticio-do-app",
    WHATSAPP_VERIFY_TOKEN: "verify-token-ficticio",
}

function insertParams(query: ReturnType<typeof fakeClient>["query"]): unknown[] {
    return (query.mock.calls[1] as unknown[] | undefined)?.[1] as unknown[]
}

describe("seedWhatsAppSettings", () => {
    it("mantem a linha existente sem ler as variaveis nem inserir", async () => {
        const { client, query } = fakeClient(true)
        const env = new Proxy({}, { get: () => { throw new Error("leu a variavel") } })

        const outcome = await seedWhatsAppSettings(client, env, { encrypt: fakeEncrypt })

        expect(outcome).toBe("kept")
        expect(query).toHaveBeenCalledTimes(1)
    })

    it("cria a linha com o ID do numero, o ID da conta, os segredos cifrados e o verify_token do .env", async () => {
        const { client, query } = fakeClient(false)

        const outcome = await seedWhatsAppSettings(client, fullEnv, { encrypt: fakeEncrypt })

        expect(outcome).toBe("created")
        expect(query.mock.calls[1]?.[0]).toMatch(/INSERT INTO WhatsAppSettings[\s\S]*ON CONFLICT \(id\) DO NOTHING/)
        expect(insertParams(query)).toEqual([
            "100000000000001",
            "200000000000002",
            fakeEncrypt("token-ficticio-de-acesso"),
            fakeEncrypt("segredo-ficticio-do-app"),
            "verify-token-ficticio",
        ])
    })

    it("cria a linha com business_account_id NULL quando WHATSAPP_BUSINESS_ACCOUNT_ID nao existe", async () => {
        const { client, query } = fakeClient(false)
        const { WHATSAPP_BUSINESS_ACCOUNT_ID: _ignored, ...env } = fullEnv

        await seedWhatsAppSettings(client, env, { encrypt: fakeEncrypt })

        expect(insertParams(query)[1]).toBeNull()
        expect(insertParams(query)[0]).toBe("100000000000001")
    })

    it("gera um verify_token com 64 caracteres hexadecimais quando a variavel nao existe", async () => {
        const { client, query } = fakeClient(false)

        await seedWhatsAppSettings(client, {}, { encrypt: fakeEncrypt })

        expect(insertParams(query)[4]).toMatch(/^[0-9a-f]{64}$/)
    })

    it("grava NULL nas variaveis vazias ou ausentes sem chamar o encrypt", async () => {
        const { client, query } = fakeClient(false)
        const encrypt = vi.fn((value: string) => `cifrado:${value}`)

        await seedWhatsAppSettings(
            client,
            { WHATSAPP_PHONE_NUMBER_ID: "", WHATSAPP_ACCESS_TOKEN: "  ", WHATSAPP_VERIFY_TOKEN: "verify-token-ficticio" },
            { encrypt },
        )

        expect(insertParams(query)).toEqual([null, null, null, null, "verify-token-ficticio"])
        expect(encrypt).not.toHaveBeenCalled()
    })

    it("falha sem gravar e sem expor o valor quando WHATSAPP_VERIFY_TOKEN tem mais de 64 caracteres", async () => {
        const { client, query } = fakeClient(false)
        const value = "x".repeat(65)

        const error = await seedWhatsAppSettings(client, { WHATSAPP_VERIFY_TOKEN: value }, { encrypt: fakeEncrypt }).catch(
            (caught: Error) => caught,
        )

        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("WHATSAPP_VERIFY_TOKEN")
        expect((error as Error).message).not.toContain(value)
        expect(query).toHaveBeenCalledTimes(1)
    })

    it.each(["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_BUSINESS_ACCOUNT_ID"])(
        "falha sem gravar e sem expor o valor quando %s nao e numerico",
        async (name) => {
            const { client, query } = fakeClient(false)

            const error = await seedWhatsAppSettings(client, { ...fullEnv, [name]: "id-invalido" }, { encrypt: fakeEncrypt }).catch(
                (caught: Error) => caught,
            )

            expect(error).toBeInstanceOf(Error)
            expect((error as Error).message).toContain(name)
            expect((error as Error).message).not.toContain("id-invalido")
            expect(query).toHaveBeenCalledTimes(1)
        },
    )
})
