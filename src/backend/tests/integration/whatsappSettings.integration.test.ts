import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"
import getPool from "../../db/connection"
import { seedWhatsAppSettings } from "../../db/seeds/whatsappSettings.seed"
import { whatsappSettingsRepository } from "../../repositories/whatsappSettings.repository"
import { decrypt, encrypt } from "../../utils/crypto.utils"

const VERIFY_TOKEN = "a".repeat(64)

let originalRow: Record<string, unknown> | undefined
let userId = 0

async function clearRow(): Promise<void> {
    await getPool().query("DELETE FROM WhatsAppSettings")
}

async function restoreRow(): Promise<void> {
    await clearRow()
    if (!originalRow) {
        return
    }
    const columns = Object.keys(originalRow)
    const placeholders = columns.map((_column, index) => `$${index + 1}`)
    await getPool().query(
        `INSERT INTO WhatsAppSettings (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
        columns.map((column) => originalRow?.[column]),
    )
}

async function rowCount(): Promise<number> {
    const result = await getPool().query<{ count: string }>("SELECT count(*) FROM WhatsAppSettings")
    return Number(result.rows[0]?.count)
}

describe("Repositorio da configuracao do WhatsApp com Postgres", () => {
    beforeAll(async () => {
        const existing = await getPool().query<Record<string, unknown>>("SELECT * FROM WhatsAppSettings WHERE id = 1")
        originalRow = existing.rows[0]
        const user = await getPool().query<{ id: string }>(
            "INSERT INTO Users (name, email, password_hash) VALUES ('Admin Integracao WhatsApp', $1, 'hash-ficticio') RETURNING id",
            [`integracao-whatsapp-${process.pid}-${Date.now()}@exemplo.test`],
        )
        userId = Number(user.rows[0]?.id)
    })

    beforeEach(clearRow)

    afterAll(async () => {
        try {
            await restoreRow()
            await getPool().query("DELETE FROM Users WHERE id = $1", [userId])
        } finally {
            await getPool().end()
        }
    })

    test("isAutoReplyPaused devolve false com a tabela vazia e nao cria a linha", async () => {
        const paused = await whatsappSettingsRepository.isAutoReplyPaused()

        expect(paused).toBe(false)
        expect(await rowCount()).toBe(0)
        expect(await whatsappSettingsRepository.findRow()).toBeNull()
    })

    test("ensureRow cria a linha uma unica vez e mantem o verify_token da primeira", async () => {
        const first = await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)
        const second = await whatsappSettingsRepository.ensureRow("b".repeat(64))

        expect(first.verifyToken).toBe(VERIFY_TOKEN)
        expect(second.verifyToken).toBe(VERIFY_TOKEN)
        expect(second).toMatchObject({
            phoneNumberId: null,
            businessAccountId: null,
            accessTokenEncrypted: null,
            appSecretEncrypted: null,
            autoReplyPaused: false,
            credentialsValid: null,
            credentialsCheckedAt: null,
            updatedBy: null,
        })
        expect(await rowCount()).toBe(1)
    })

    test("saveCredentials grava os valores cifrados, marca as credenciais validas e devolve quem alterou", async () => {
        await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)
        const accessTokenEncrypted = encrypt("token-ficticio-de-acesso")
        const appSecretEncrypted = encrypt("segredo-ficticio-do-app")

        const row = await whatsappSettingsRepository.saveCredentials({
            phoneNumberId: "100000000000001",
            businessAccountId: null,
            accessTokenEncrypted,
            appSecretEncrypted,
            updatedBy: userId,
        })

        expect(row).toMatchObject({
            phoneNumberId: "100000000000001",
            businessAccountId: null,
            accessTokenEncrypted,
            appSecretEncrypted,
            credentialsValid: true,
            updatedBy: { id: userId, name: "Admin Integracao WhatsApp" },
        })
        expect(row.credentialsCheckedAt).toBeInstanceOf(Date)
    })

    test("o banco recusa segredo em claro com 23514", async () => {
        await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)

        await expect(
            whatsappSettingsRepository.saveCredentials({
                phoneNumberId: "100000000000001",
                businessAccountId: null,
                accessTokenEncrypted: "token-em-claro",
                appSecretEncrypted: encrypt("segredo-ficticio-do-app"),
                updatedBy: userId,
            }),
        ).rejects.toMatchObject({ code: "23514" })
    })

    test("setAutoReplyPaused liga e desliga a pausa gravando quem alterou", async () => {
        await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)

        const paused = await whatsappSettingsRepository.setAutoReplyPaused(true, userId)
        const pausedRead = await whatsappSettingsRepository.isAutoReplyPaused()
        const resumed = await whatsappSettingsRepository.setAutoReplyPaused(false, userId)

        expect(paused.autoReplyPaused).toBe(true)
        expect(paused.updatedBy).toEqual({ id: userId, name: "Admin Integracao WhatsApp" })
        expect(pausedRead).toBe(true)
        expect(resumed.autoReplyPaused).toBe(false)
        expect(await whatsappSettingsRepository.isAutoReplyPaused()).toBe(false)
    })

    test("recordCredentialsCheck grava o resultado sem mudar updated_at nem updated_by", async () => {
        const before = await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)

        await whatsappSettingsRepository.recordCredentialsCheck(false)
        const after = await whatsappSettingsRepository.findRow()

        expect(after?.credentialsValid).toBe(false)
        expect(after?.credentialsCheckedAt).toBeInstanceOf(Date)
        expect(after?.updatedAt.getTime()).toBe(before.updatedAt.getTime())
        expect(after?.updatedBy).toBeNull()
    })

    test("o seed cria a linha a partir do .env na primeira execucao e nao altera nada na segunda", async () => {
        const client = await getPool().connect()
        try {
            const first = await seedWhatsAppSettings(client, {
                WHATSAPP_PHONE_NUMBER_ID: "100000000000001",
                WHATSAPP_ACCESS_TOKEN: "token-ficticio-de-acesso",
                WHATSAPP_APP_SECRET: "segredo-ficticio-do-app",
                WHATSAPP_VERIFY_TOKEN: "verify-token-ficticio",
            })
            const created = await whatsappSettingsRepository.findRow()
            const second = await seedWhatsAppSettings(client, {
                WHATSAPP_PHONE_NUMBER_ID: "999999999999999",
                WHATSAPP_ACCESS_TOKEN: "outro-token",
                WHATSAPP_VERIFY_TOKEN: "outro-verify-token",
            })
            const kept = await whatsappSettingsRepository.findRow()

            expect(first).toBe("created")
            expect(second).toBe("kept")
            expect(created).toMatchObject({
                phoneNumberId: "100000000000001",
                businessAccountId: null,
                verifyToken: "verify-token-ficticio",
                credentialsValid: null,
                updatedBy: null,
            })
            expect(decrypt(created?.accessTokenEncrypted as string)).toBe("token-ficticio-de-acesso")
            expect(decrypt(created?.appSecretEncrypted as string)).toBe("segredo-ficticio-do-app")
            expect(kept).toEqual(created)
            expect(await rowCount()).toBe(1)
        } finally {
            client.release()
        }
    })
})
