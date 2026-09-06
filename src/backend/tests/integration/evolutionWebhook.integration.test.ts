import { createHmac } from "crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"

const testPhone = "5500000000999"

function testPhoneHash(): string {
    const secret = process.env.PHONE_HASH_SECRET
    if (!secret) {
        throw new Error("PHONE_HASH_SECRET is required for integration tests")
    }
    return createHmac("sha256", secret).update(testPhone).digest("hex")
}

async function removeTestSession(): Promise<void> {
    await getPool().query("DELETE FROM Sessions WHERE phone_hash = $1", [testPhoneHash()])
}

describe("Evolution webhook integration", () => {
    beforeAll(removeTestSession)

    afterAll(async () => {
        await removeTestSession()
        await getPool().end()
    })

    test("persiste uma unica sessao para entregas repetidas", async () => {
        const token = process.env.EVOLUTION_WEBHOOK_TOKEN
        const payload = {
            event: "messages.upsert",
            instance: "integration-test",
            data: {
                key: {
                    remoteJid: `${testPhone}@s.whatsapp.net`,
                    fromMe: false,
                    id: "integration-test-message",
                },
                message: { conversation: "Mensagem de teste" },
            },
        }

        const firstResponse = await request(app)
            .post("/api/v1/webhooks/evolution")
            .query({ token })
            .send(payload)
        const secondResponse = await request(app)
            .post("/api/v1/webhooks/evolution")
            .query({ token })
            .send(payload)

        expect(firstResponse.status).toBe(202)
        expect(firstResponse.body.data).toMatchObject({ status: "processed", newSession: true })
        expect(secondResponse.status).toBe(202)
        expect(secondResponse.body.data).toMatchObject({ status: "processed", newSession: false })

        const result = await getPool().query<{ count: string }>(
            "SELECT count(*) FROM Sessions WHERE phone_hash = $1",
            [testPhoneHash()],
        )
        expect(result.rows[0]?.count).toBe("1")
    })
})
