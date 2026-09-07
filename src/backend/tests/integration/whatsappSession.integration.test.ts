import { createHmac } from "crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"

const testPhone = "5500000000998"

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

describe("Whatsapp session integration", () => {
    beforeAll(removeTestSession)

    afterAll(async () => {
        await removeTestSession()
        await getPool().end()
    })

    test("recusa a requisicao sem o token interno", async () => {
        const response = await request(app)
            .post("/api/v1/whatsapp/sessions")
            .send({ phone: testPhone })

        expect(response.status).toBe(401)
    })

    test("persiste uma unica sessao para entregas repetidas do mesmo telefone", async () => {
        const token = process.env.GATEWAY_INTERNAL_TOKEN

        const firstResponse = await request(app)
            .post("/api/v1/whatsapp/sessions")
            .set("X-Internal-Token", token as string)
            .send({ phone: testPhone })
        const secondResponse = await request(app)
            .post("/api/v1/whatsapp/sessions")
            .set("X-Internal-Token", token as string)
            .send({ phone: testPhone })

        expect(firstResponse.status).toBe(202)
        expect(firstResponse.body.data).toMatchObject({ newSession: true })
        expect(secondResponse.status).toBe(202)
        expect(secondResponse.body.data).toMatchObject({ newSession: false })

        const result = await getPool().query<{ count: string; phone_hash: string }>(
            "SELECT count(*), phone_hash FROM Sessions WHERE phone_hash = $1 GROUP BY phone_hash",
            [testPhoneHash()],
        )
        expect(result.rows[0]?.count).toBe("1")
        expect(result.rows[0]?.phone_hash).not.toContain(testPhone)
    })
})
