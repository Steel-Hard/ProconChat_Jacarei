import { createHmac } from "crypto"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import getPool from "../../db/connection"
import { sessionRepository } from "../../repositories/session.repository"

const phones = {
    concurrent: "5500000000981",
    categoryStep: "5500000000982",
}

function phoneHash(phone: string): string {
    const secret = process.env.PHONE_HASH_SECRET
    if (!secret) {
        throw new Error("PHONE_HASH_SECRET is required for integration tests")
    }
    return createHmac("sha256", secret).update(phone).digest("hex")
}

async function removeTestSessions(): Promise<void> {
    await getPool().query("DELETE FROM Sessions WHERE phone_hash = ANY($1::text[])", [
        Object.values(phones).map(phoneHash),
    ])
}

async function expire(sessionId: string): Promise<void> {
    await getPool().query(
        "UPDATE Sessions SET last_interaction_at = now() - interval '31 minutes' WHERE id = $1",
        [sessionId],
    )
}

describe("Abandono da sessão com Postgres", () => {
    beforeAll(async () => {
        await removeTestSessions()
    })

    afterAll(async () => {
        await removeTestSessions()
        await getPool().end()
    })

    test("duas mensagens simultâneas após o timeout criam uma só sessão e gravam um só ABANDONED", async () => {
        const hash = phoneHash(phones.concurrent)
        const stale = await sessionRepository.findOrCreateActive(hash)
        await expire(stale.id)

        const [first, second] = await Promise.all([
            sessionRepository.findOrCreateActive(hash),
            sessionRepository.findOrCreateActive(hash),
        ])

        expect(first.id).toBe(second.id)
        expect(first.id).not.toBe(stale.id)
        const inProgress = await getPool().query(
            "SELECT 1 FROM Sessions WHERE phone_hash = $1 AND status = 'IN_PROGRESS'",
            [hash],
        )
        expect(inProgress.rowCount).toBe(1)
        const abandoned = await getPool().query(
            "SELECT 1 FROM ConversationEvents WHERE session_id = $1 AND type = 'ABANDONED'",
            [stale.id],
        )
        expect(abandoned.rowCount).toBe(1)
    })

    test("sessão expirada em AWAITING_CATEGORY guarda essa etapa e não FINISHED", async () => {
        const hash = phoneHash(phones.categoryStep)
        const stale = await sessionRepository.findOrCreateActive(hash)
        await expire(stale.id)

        await sessionRepository.findOrCreateActive(hash)

        const session = await getPool().query<{ status: string; abandoned_at_step: string }>(
            "SELECT status, abandoned_at_step FROM Sessions WHERE id = $1",
            [stale.id],
        )
        const events = await getPool().query<{ data: unknown }>(
            "SELECT data FROM ConversationEvents WHERE session_id = $1 AND type = 'ABANDONED'",
            [stale.id],
        )
        expect(session.rows[0]).toEqual({ status: "ABANDONED", abandoned_at_step: "AWAITING_CATEGORY" })
        expect(events.rows).toEqual([{ data: { step: "AWAITING_CATEGORY" } }])
    })
})
