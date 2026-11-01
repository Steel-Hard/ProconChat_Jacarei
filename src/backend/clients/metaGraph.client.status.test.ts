import { createHmac } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createMetaGraphClient, FetchFn } from "./metaGraph.client"

const ACCESS_TOKEN = "EAAG-token-ficticio-de-acesso"
const APP_SECRET = "segredo-ficticio-do-app"
const PROOF = createHmac("sha256", APP_SECRET).update(ACCESS_TOKEN).digest("hex")
const auth = { accessToken: ACCESS_TOKEN, appSecret: APP_SECRET, graphApiVersion: "v26.0" }
const templates = [
    { kind: "CANCELLATION" as const, name: "aviso_cancelamento", languageCode: "pt_BR" },
    { kind: "REMINDER" as const, name: "lembrete_atendimento", languageCode: "pt_BR" },
]

function jsonResponse(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function templatesOf(...items: { name: string; language: string; status: string }[]) {
    return jsonResponse(200, { data: items.map((item, index) => ({ ...item, id: String(index + 1) })) })
}

describe("metaGraph client: status dos modelos", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("consulta cada modelo pelo nome na conta, com a versão e o appsecret_proof", async () => {
        const fetchFn = vi.fn<FetchFn>().mockResolvedValue(templatesOf())
        const client = createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } })

        await client.listMessageTemplates({ ...auth, businessAccountId: "200000000000002" }, templates)

        expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
            `https://graph.facebook.com/v26.0/200000000000002/message_templates?fields=name%2Cstatus%2Clanguage&name=aviso_cancelamento&appsecret_proof=${PROOF}`,
            `https://graph.facebook.com/v26.0/200000000000002/message_templates?fields=name%2Cstatus%2Clanguage&name=lembrete_atendimento&appsecret_proof=${PROOF}`,
        ])
        expect(fetchFn.mock.calls[0]?.[1].headers).toEqual({ Authorization: `Bearer ${ACCESS_TOKEN}` })
    })

    it.each([
        { metaStatus: "APPROVED", status: "APPROVED" },
        { metaStatus: "PENDING", status: "PENDING" },
        { metaStatus: "IN_APPEAL", status: "PENDING" },
        { metaStatus: "REJECTED", status: "REJECTED" },
        { metaStatus: "PAUSED", status: "OTHER" },
        { metaStatus: "DISABLED", status: "OTHER" },
        { metaStatus: "PENDING_DELETION", status: "OTHER" },
        { metaStatus: "DELETED", status: "OTHER" },
        { metaStatus: "LIMIT_EXCEEDED", status: "OTHER" },
        { metaStatus: "ARCHIVED", status: "OTHER" },
    ])("mapeia o status $metaStatus da Meta para $status", async ({ metaStatus, status }) => {
        const fetchFn = vi
            .fn<FetchFn>()
            .mockResolvedValueOnce(templatesOf({ name: "aviso_cancelamento", language: "pt_BR", status: metaStatus }))
            .mockResolvedValueOnce(templatesOf())
        const client = createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } })

        const result = await client.listMessageTemplates({ ...auth, businessAccountId: "200000000000002" }, templates)

        expect(result).toEqual({
            ok: true,
            templates: [
                { kind: "CANCELLATION", name: "aviso_cancelamento", languageCode: "pt_BR", status, metaStatus },
                { kind: "REMINDER", name: "lembrete_atendimento", languageCode: "pt_BR", status: "NOT_FOUND", metaStatus: null },
            ],
        })
    })

    it("considera NOT_FOUND o modelo devolvido só em outro idioma ou com outro nome", async () => {
        const fetchFn = vi
            .fn<FetchFn>()
            .mockResolvedValueOnce(templatesOf({ name: "aviso_cancelamento", language: "en_US", status: "APPROVED" }))
            .mockResolvedValueOnce(templatesOf({ name: "lembrete_atendimento_v2", language: "pt_BR", status: "APPROVED" }))
        const client = createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } })

        const result = await client.listMessageTemplates({ ...auth, businessAccountId: "200000000000002" }, templates)

        expect(result.ok && result.templates.map((template) => template.status)).toEqual(["NOT_FOUND", "NOT_FOUND"])
    })

    it.each([
        { label: "o código 190", response: () => Promise.resolve(jsonResponse(400, { error: { code: 190, message: "Token inválido" } })), reason: "INVALID_TOKEN" },
        { label: "a falha de rede", response: () => Promise.reject(new TypeError("fetch failed")), reason: "META_UNAVAILABLE" },
    ])("devolve a recusa com o motivo do teste de conexão para $label e para de consultar", async ({ response, reason }) => {
        const fetchFn = vi.fn<FetchFn>(response)
        const client = createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } })

        const result = await client.listMessageTemplates({ ...auth, businessAccountId: "200000000000002" }, templates)

        expect(result).toEqual({ ok: false, reason })
        expect(fetchFn).toHaveBeenCalledTimes(1)
    })
})

describe("metaGraph client: estado do número", () => {
    const phoneInput = { ...auth, phoneNumberId: "100000000000001" }

    it("consulta o número com os campos de qualidade e de limite de mensagens", async () => {
        const fetchFn = vi.fn<FetchFn>().mockResolvedValue(jsonResponse(200, { id: "100000000000001" }))
        const client = createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } })

        await client.getPhoneNumberStatus(phoneInput)

        expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
            `https://graph.facebook.com/v26.0/100000000000001?fields=quality_rating%2Cwhatsapp_business_manager_messaging_limit&appsecret_proof=${PROOF}`,
        ])
    })

    it.each([
        { quality_rating: "GREEN", qualityRating: "HIGH" },
        { quality_rating: "YELLOW", qualityRating: "MEDIUM" },
        { quality_rating: "RED", qualityRating: "LOW" },
        { quality_rating: "NA", qualityRating: "UNKNOWN" },
        { quality_rating: undefined, qualityRating: "UNKNOWN" },
    ])("mapeia a qualidade $quality_rating para $qualityRating", async ({ quality_rating, qualityRating }) => {
        const fetchFn = vi.fn<FetchFn>().mockResolvedValue(jsonResponse(200, { id: "100000000000001", quality_rating }))
        const client = createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } })

        const result = await client.getPhoneNumberStatus(phoneInput)

        expect(result).toMatchObject({ ok: true, qualityRating })
    })

    it.each([
        { limit: "TIER_250", tier: "TIER_250", dailyLimit: 250 },
        { limit: "TIER_2K", tier: "TIER_2K", dailyLimit: null },
        { limit: undefined, tier: null, dailyLimit: null },
    ])("devolve o tier $limit com o limite diário $dailyLimit", async ({ limit, tier, dailyLimit }) => {
        const fetchFn = vi.fn<FetchFn>().mockResolvedValue(
            jsonResponse(200, { id: "100000000000001", quality_rating: "GREEN", whatsapp_business_manager_messaging_limit: limit }),
        )
        const client = createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } })

        const result = await client.getPhoneNumberStatus(phoneInput)

        expect(result).toEqual({ ok: true, qualityRating: "HIGH", tier, dailyLimit })
    })

    it("devolve a recusa INVALID_TOKEN quando a Meta responde com o código 190", async () => {
        const fetchFn = vi.fn<FetchFn>().mockResolvedValue(jsonResponse(400, { error: { code: 190, message: "Token inválido" } }))
        const client = createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } })

        const result = await client.getPhoneNumberStatus(phoneInput)

        expect(result).toEqual({ ok: false, reason: "INVALID_TOKEN" })
    })
})

