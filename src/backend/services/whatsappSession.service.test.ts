import { beforeEach, describe, expect, test, vi } from "vitest"
import { SessionRepository } from "../repositories/session.repository"
import { createWhatsappSessionService, hashPhone } from "./whatsappSession.service"

describe("Whatsapp session service", () => {
    const findOrCreateActive = vi.fn()
    const updateNavigationState = vi.fn()
    const finish = vi.fn()
    const sessions: SessionRepository = { findOrCreateActive, updateNavigationState, finish }
    const resolveWhatsappSession = createWhatsappSessionService({ sessions })

    beforeEach(() => {
        vi.clearAllMocks()
        process.env.PHONE_HASH_SECRET = "test-secret"
    })

    test("resolve uma sessao nova sem persistir o telefone em texto puro", async () => {
        findOrCreateActive.mockResolvedValueOnce({ id: "42", created: true })

        await expect(resolveWhatsappSession({ phone: "5511999999999" })).resolves.toEqual({
            sessionId: "42",
            newSession: true,
        })

        const phoneHash = findOrCreateActive.mock.calls[0]?.[0]
        expect(phoneHash).toMatch(/^[a-f0-9]{64}$/)
        expect(phoneHash).not.toContain("5511999999999")
    })

    test("reutiliza uma sessao ativa existente", async () => {
        findOrCreateActive.mockResolvedValueOnce({ id: "42", created: false })

        await expect(resolveWhatsappSession({ phone: "5511999999999" })).resolves.toEqual({
            sessionId: "42",
            newSession: false,
        })
    })

    test("hashPhone gera o mesmo hash para o mesmo telefone", () => {
        expect(hashPhone("5511999999999")).toBe(hashPhone("5511999999999"))
    })
})
