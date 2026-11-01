import { createHmac } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { seedWhatsAppSettings } from "../../db/seeds/whatsappSettings.seed"
import { auditLogRepository } from "../../repositories/auditLog.repository"
import { whatsappSettingsRepository } from "../../repositories/whatsappSettings.repository"
import { decrypt, encrypt } from "../../utils/crypto.utils"

const VERIFY_TOKEN = "a".repeat(64)
const PAUSE_TEST_PHONE = "5500000000997"
const PAUSED_MESSAGE =
    "O atendimento automático do PROCON Jacareí está temporariamente indisponível. Tente novamente mais tarde."

function pauseTestPhoneHash(): string {
    return createHmac("sha256", process.env.PHONE_HASH_SECRET as string).update(PAUSE_TEST_PHONE).digest("hex")
}

async function removePauseTestSessions(): Promise<void> {
    await getPool().query("DELETE FROM Sessions WHERE phone_hash = $1", [pauseTestPhoneHash()])
}

let originalRow: Record<string, unknown> | undefined
let userId = 0

async function clearRow(): Promise<void> {
    await getPool().query("DELETE FROM WhatsAppSettings")
}

async function clearAudit(): Promise<void> {
    await getPool().query("DELETE FROM AuditLog WHERE actor_user_id = $1 OR action LIKE 'it88_%'", [userId])
}

async function insertAudit(area: string, action: string, actor: number | null, createdAt: Date, data: object = {}): Promise<string> {
    const result = await getPool().query<{ id: string }>(
        "INSERT INTO AuditLog (area, action, actor_user_id, data, created_at) VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING id",
        [area, action, actor, JSON.stringify(data), createdAt],
    )
    return String(result.rows[0]?.id)
}

async function auditRows() {
    const result = await getPool().query<{ area: string; action: string; actor_user_id: string | null; data: unknown }>(
        "SELECT area, action, actor_user_id, data FROM AuditLog WHERE actor_user_id = $1 ORDER BY id",
        [userId],
    )
    return result.rows
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

    beforeEach(async () => {
        await clearRow()
        await clearAudit()
    })

    afterAll(async () => {
        try {
            await removePauseTestSessions()
            await restoreRow()
            await clearAudit()
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
            displayPhoneNumber: null,
            verifiedName: null,
            accessTokenLifetime: { kind: "UNKNOWN", expiresAt: null },
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
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
            accessTokenLifetime: { kind: "PERMANENT", expiresAt: null },
            updatedBy: userId,
            auditFields: [],
        })

        expect(row).toMatchObject({
            phoneNumberId: "100000000000001",
            businessAccountId: null,
            accessTokenEncrypted,
            appSecretEncrypted,
            credentialsValid: true,
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
            accessTokenLifetime: { kind: "PERMANENT", expiresAt: null },
            updatedBy: { id: userId, name: "Admin Integracao WhatsApp" },
        })
        expect(row.credentialsCheckedAt).toBeInstanceOf(Date)
    })

    test("saveCredentials grava o tipo do token, mantem com null e zera com UNKNOWN", async () => {
        await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)
        const base = {
            phoneNumberId: "100000000000001",
            businessAccountId: null,
            accessTokenEncrypted: encrypt("token-ficticio-de-acesso"),
            appSecretEncrypted: encrypt("segredo-ficticio-do-app"),
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
            updatedBy: userId,
            auditFields: [],
        }

        const expiring = await whatsappSettingsRepository.saveCredentials({
            ...base,
            accessTokenLifetime: { kind: "EXPIRING", expiresAt: "2026-12-14T15:30:00.000Z" },
        })
        const kept = await whatsappSettingsRepository.saveCredentials({ ...base, accessTokenLifetime: null })
        const cleared = await whatsappSettingsRepository.saveCredentials({
            ...base,
            accessTokenLifetime: { kind: "UNKNOWN", expiresAt: null },
        })

        expect(expiring.accessTokenLifetime).toEqual({ kind: "EXPIRING", expiresAt: "2026-12-14T15:30:00.000Z" })
        expect(kept.accessTokenLifetime).toEqual({ kind: "EXPIRING", expiresAt: "2026-12-14T15:30:00.000Z" })
        expect(cleared.accessTokenLifetime).toEqual({ kind: "UNKNOWN", expiresAt: null })
    })

    test("saveCredentials grava no historico a acao credentials_saved com o autor e so os nomes dos campos", async () => {
        await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)

        await whatsappSettingsRepository.saveCredentials({
            phoneNumberId: "100000000000001",
            businessAccountId: "200000000000009",
            accessTokenEncrypted: encrypt("EAAtokenSecreto123456"),
            appSecretEncrypted: encrypt("appsecret987654"),
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
            accessTokenLifetime: null,
            updatedBy: userId,
            auditFields: ["businessAccountId", "accessToken"],
        })

        expect(await auditRows()).toEqual([
            {
                area: "whatsapp",
                action: "credentials_saved",
                actor_user_id: String(userId),
                data: { fields: ["businessAccountId", "accessToken"] },
            },
        ])
    })

    test("o historico lido do banco nao contem o token nem o App Secret em claro, cifrados ou pelos 4 ultimos caracteres", async () => {
        await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)
        await whatsappSettingsRepository.saveCredentials({
            phoneNumberId: "100000000000001",
            businessAccountId: null,
            accessTokenEncrypted: encrypt("EAAtokenSecreto123456"),
            appSecretEncrypted: encrypt("appsecret987654"),
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
            accessTokenLifetime: null,
            updatedBy: userId,
            auditFields: ["accessToken", "appSecret"],
        })

        const serializedHistory = JSON.stringify(await auditLogRepository.listByArea("whatsapp", 50))
        const storedData = JSON.stringify(await auditRows())

        expect(serializedHistory).toContain("credentials_saved")
        for (const secret of ["EAAtokenSecreto123456", "appsecret987654", "v1:", "3456", "7654"]) {
            expect(serializedHistory).not.toContain(secret)
            expect(storedData).not.toContain(secret)
        }
    })

    test("o banco recusa segredo em claro com 23514", async () => {
        await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)

        await expect(
            whatsappSettingsRepository.saveCredentials({
                phoneNumberId: "100000000000001",
                businessAccountId: null,
                accessTokenEncrypted: "token-em-claro",
                appSecretEncrypted: encrypt("segredo-ficticio-do-app"),
                displayPhoneNumber: "+55 12 3955-9000",
                verifiedName: "PROCON Jacareí",
                accessTokenLifetime: null,
                updatedBy: userId,
                auditFields: [],
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

    test("setAutoReplyPaused grava no historico auto_reply_paused e auto_reply_resumed sem dados", async () => {
        await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)

        await whatsappSettingsRepository.setAutoReplyPaused(true, userId)
        await whatsappSettingsRepository.setAutoReplyPaused(false, userId)

        expect(await auditRows()).toEqual([
            { area: "whatsapp", action: "auto_reply_paused", actor_user_id: String(userId), data: {} },
            { area: "whatsapp", action: "auto_reply_resumed", actor_user_id: String(userId), data: {} },
        ])
    })

    test("listByArea traz da alteracao mais recente para a mais antiga, desempata pelo id, limita e mostra o autor", async () => {
        const base = Date.UTC(2099, 5, 1)
        for (let second = 1; second <= 49; second += 1) {
            await insertAudit("whatsapp", `it88_old_${second}`, userId, new Date(base + second * 1000))
        }
        const withoutActor = await insertAudit("whatsapp", "it88_without_actor", null, new Date(base + 50_000))
        const tieFirst = await insertAudit("whatsapp", "it88_tie_first", userId, new Date(base + 100_000), { fields: ["accessToken"] })
        const tieSecond = await insertAudit("whatsapp", "it88_tie_second", userId, new Date(base + 100_000), { fields: [] })
        await insertAudit("schedule", "it88_other_area", userId, new Date(base + 200_000))

        const items = await auditLogRepository.listByArea("whatsapp", 50)

        expect(items).toHaveLength(50)
        expect(items.slice(0, 3)).toEqual([
            {
                id: tieSecond,
                action: "it88_tie_second",
                fields: [],
                actor: { id: userId, name: "Admin Integracao WhatsApp" },
                createdAt: new Date(base + 100_000),
            },
            {
                id: tieFirst,
                action: "it88_tie_first",
                fields: ["accessToken"],
                actor: { id: userId, name: "Admin Integracao WhatsApp" },
                createdAt: new Date(base + 100_000),
            },
            { id: withoutActor, action: "it88_without_actor", fields: [], actor: null, createdAt: new Date(base + 50_000) },
        ])
        expect(items.at(-1)?.action).toBe("it88_old_3")
        expect(items.map((item) => item.action)).not.toContain("it88_other_area")
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

    test("recordCredentialsCheck valido grava o numero e o nome verificados sem mudar updated_at nem updated_by", async () => {
        const before = await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)

        await whatsappSettingsRepository.recordCredentialsCheck(true, {
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
        })
        const after = await whatsappSettingsRepository.findRow()

        expect(after).toMatchObject({
            credentialsValid: true,
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
            updatedBy: null,
        })
        expect(after?.updatedAt.getTime()).toBe(before.updatedAt.getTime())
    })

    test("recordCredentialsCheck com o tipo do token o grava sem mudar updated_at nem updated_by", async () => {
        const before = await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)
        const verified = { displayPhoneNumber: "+55 12 3955-9000", verifiedName: "PROCON Jacareí" }

        await whatsappSettingsRepository.recordCredentialsCheck(true, verified, {
            kind: "EXPIRING",
            expiresAt: "2026-12-14T15:30:00.000Z",
        })
        const expiring = await whatsappSettingsRepository.findRow()
        await whatsappSettingsRepository.recordCredentialsCheck(true, verified)
        const kept = await whatsappSettingsRepository.findRow()
        await whatsappSettingsRepository.recordCredentialsCheck(true, verified, { kind: "PERMANENT", expiresAt: null })
        const permanent = await whatsappSettingsRepository.findRow()

        expect(expiring?.accessTokenLifetime).toEqual({ kind: "EXPIRING", expiresAt: "2026-12-14T15:30:00.000Z" })
        expect(kept?.accessTokenLifetime).toEqual({ kind: "EXPIRING", expiresAt: "2026-12-14T15:30:00.000Z" })
        expect(permanent).toMatchObject({ accessTokenLifetime: { kind: "PERMANENT", expiresAt: null }, updatedBy: null })
        expect(permanent?.updatedAt.getTime()).toBe(before.updatedAt.getTime())
    })

    test("recordCredentialsCheck sem o numero mantem o numero e o nome guardados", async () => {
        await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)
        await whatsappSettingsRepository.recordCredentialsCheck(true, {
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
        })

        await whatsappSettingsRepository.recordCredentialsCheck(false)
        const after = await whatsappSettingsRepository.findRow()

        expect(after).toMatchObject({
            credentialsValid: false,
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
        })
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

    test("com a pausa ligada, a mensagem recebe o texto fixo e nenhuma sessao e criada", async () => {
        await removePauseTestSessions()
        await whatsappSettingsRepository.ensureRow(VERIFY_TOKEN)
        await whatsappSettingsRepository.setAutoReplyPaused(true, userId)

        const response = await request(app)
            .post("/api/v1/whatsapp/sessions")
            .set("X-Internal-Token", process.env.GATEWAY_INTERNAL_TOKEN as string)
            .send({ phone: PAUSE_TEST_PHONE, text: "Olá" })

        expect(response.status).toBe(202)
        expect(response.body).toEqual({
            data: {
                sessionId: null,
                newSession: false,
                paused: true,
                reply: { text: PAUSED_MESSAGE, step: null, messages: [{ type: "text", text: PAUSED_MESSAGE }] },
            },
        })
        const sessions = await getPool().query("SELECT 1 FROM Sessions WHERE phone_hash = $1", [pauseTestPhoneHash()])
        expect(sessions.rowCount).toBe(0)
        await whatsappSettingsRepository.setAutoReplyPaused(false, userId)
        expect(await whatsappSettingsRepository.isAutoReplyPaused()).toBe(false)
    })
})
