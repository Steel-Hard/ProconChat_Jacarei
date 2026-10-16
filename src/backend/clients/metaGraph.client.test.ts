import { createHmac } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createMetaGraphClient, FetchFn, META_TOKEN_INSPECTION_TIMEOUT_MS } from "./metaGraph.client"
import { ConnectionCheckInput } from "../types/whatsappSettings.types"

const ACCESS_TOKEN = "EAAG-token-ficticio-de-acesso"
const APP_SECRET = "segredo-ficticio-do-app"
const PROOF = createHmac("sha256", APP_SECRET).update(ACCESS_TOKEN).digest("hex")

const input: ConnectionCheckInput = {
    phoneNumberId: "100000000000001",
    businessAccountId: null,
    accessToken: ACCESS_TOKEN,
    appSecret: APP_SECRET,
    graphApiVersion: "v26.0",
}

const phoneOk = { display_phone_number: "+55 12 99999-0000", verified_name: "PROCON Jacareí", id: "100000000000001" }

function jsonResponse(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function graphError(code: number, extra: Record<string, unknown> = {}) {
    return jsonResponse(400, { error: { message: "Erro ficticio", type: "OAuthException", code, ...extra } })
}

function fetchSequence(...responses: ReturnType<typeof jsonResponse>[]) {
    const fetchFn = vi.fn<FetchFn>()
    for (const response of responses) {
        fetchFn.mockResolvedValueOnce(response)
    }
    return fetchFn
}

function loggedOutput(spy: ReturnType<typeof vi.spyOn>): string {
    return spy.mock.calls.map((call: unknown[]) => call.map(String).join(" ")).join("\n")
}

describe("metaGraph client", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("consulta o numero pelo ID e devolve o numero e o nome verificados", async () => {
        const fetchFn = fetchSequence(jsonResponse(200, phoneOk))
        const client = createMetaGraphClient({ fetchFn })

        const result = await client.checkConnection(input)

        expect(result).toEqual({ ok: true, displayPhoneNumber: "+55 12 99999-0000", verifiedName: "PROCON Jacareí" })
        expect(fetchFn).toHaveBeenCalledTimes(1)
        const [url, init] = fetchFn.mock.calls[0] ?? []
        expect(url).toBe(
            `https://graph.facebook.com/v26.0/100000000000001?fields=display_phone_number%2Cverified_name&appsecret_proof=${PROOF}`,
        )
        expect(init?.method).toBe("GET")
        expect(init?.headers).toEqual({ Authorization: `Bearer ${ACCESS_TOKEN}` })
        expect(init?.signal).toBeInstanceOf(AbortSignal)
    })

    it("usa a versao da Graph API recebida na entrada", async () => {
        const fetchFn = fetchSequence(jsonResponse(200, phoneOk))

        await createMetaGraphClient({ fetchFn }).checkConnection({ ...input, graphApiVersion: "v25.0" })

        expect(fetchFn.mock.calls[0]?.[0]).toMatch(/^https:\/\/graph\.facebook\.com\/v25\.0\//)
    })

    it("com o ID da conta, confere que o numero pertence a ela numa segunda chamada", async () => {
        const fetchFn = fetchSequence(
            jsonResponse(200, phoneOk),
            jsonResponse(200, { data: [{ id: "100000000000009" }, { id: "100000000000001" }] }),
        )

        const result = await createMetaGraphClient({ fetchFn }).checkConnection({ ...input, businessAccountId: "200000000000002" })

        expect(result.ok).toBe(true)
        expect(fetchFn).toHaveBeenCalledTimes(2)
        expect(fetchFn.mock.calls[1]?.[0]).toBe(
            `https://graph.facebook.com/v26.0/200000000000002/phone_numbers?fields=id&limit=100&appsecret_proof=${PROOF}`,
        )
    })

    it("devolve PHONE_NOT_IN_ACCOUNT quando a conta nao lista o numero", async () => {
        const fetchFn = fetchSequence(jsonResponse(200, phoneOk), jsonResponse(200, { data: [{ id: "100000000000009" }] }))

        const result = await createMetaGraphClient({ fetchFn }).checkConnection({ ...input, businessAccountId: "200000000000002" })

        expect(result).toEqual({ ok: false, reason: "PHONE_NOT_IN_ACCOUNT" })
    })

    it.each([
        ["INVALID_TOKEN", graphError(190)],
        ["INVALID_APP_SECRET", graphError(100, { message: "Invalid appsecret_proof provided in the API argument" })],
        ["PHONE_NUMBER_NOT_FOUND", graphError(100, { error_subcode: 33 })],
        ["MISSING_PERMISSION", graphError(10)],
        ["MISSING_PERMISSION", graphError(200)],
        ["META_UNAVAILABLE", graphError(4)],
        ["META_UNAVAILABLE", graphError(80007)],
        ["META_UNAVAILABLE", jsonResponse(503, {})],
        ["META_ERROR", graphError(1)],
        ["META_ERROR", jsonResponse(400, "nao e o formato esperado")],
    ])("devolve %s para a resposta de erro da chamada do numero", async (reason, response) => {
        const fetchFn = fetchSequence(response)

        const result = await createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } }).checkConnection(input)

        expect(result).toEqual({ ok: false, reason })
    })

    it("devolve BUSINESS_ACCOUNT_NOT_FOUND quando a conta nao existe ou o token nao a acessa", async () => {
        const fetchFn = fetchSequence(jsonResponse(200, phoneOk), graphError(100, { error_subcode: 33 }))

        const result = await createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } }).checkConnection({
            ...input,
            businessAccountId: "200000000000002",
        })

        expect(result).toEqual({ ok: false, reason: "BUSINESS_ACCOUNT_NOT_FOUND" })
    })

    it("devolve META_ERROR quando a resposta de sucesso nao traz o numero e o nome", async () => {
        const fetchFn = fetchSequence(jsonResponse(200, { id: "100000000000001" }))

        const result = await createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } }).checkConnection(input)

        expect(result).toEqual({ ok: false, reason: "META_ERROR" })
    })

    it("devolve META_UNAVAILABLE quando a Meta nao responde no tempo limite", async () => {
        const fetchFn = vi.fn<FetchFn>(
            (_url, init) =>
                new Promise((_resolve, reject) => {
                    init.signal?.addEventListener("abort", () => reject(init.signal?.reason))
                }),
        )

        const result = await createMetaGraphClient({ fetchFn, timeoutMs: 5, logger: { log: vi.fn() } }).checkConnection(input)

        expect(result).toEqual({ ok: false, reason: "META_UNAVAILABLE" })
    })

    it("devolve META_UNAVAILABLE em erro de rede", async () => {
        const fetchFn = vi.fn<FetchFn>().mockRejectedValue(new TypeError(`fetch failed ${ACCESS_TOKEN}`))

        const result = await createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } }).checkConnection(input)

        expect(result).toEqual({ ok: false, reason: "META_UNAVAILABLE" })
    })

    it("loga so o motivo, o status e o codigo, sem token, App Secret, prova nem URL", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
        const fetchFn = fetchSequence(graphError(190, { message: `Token ${ACCESS_TOKEN} invalido` }))

        await createMetaGraphClient({ fetchFn }).checkConnection(input)
        await createMetaGraphClient({
            fetchFn: vi.fn<FetchFn>().mockRejectedValue(new TypeError(`fetch failed ${ACCESS_TOKEN}`)),
        }).checkConnection(input)

        const output = loggedOutput(logSpy) + loggedOutput(errorSpy)
        expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toEqual({
            event: "meta_connection_test",
            reason: "INVALID_TOKEN",
            status: 400,
            code: 190,
        })
        expect(output).not.toContain(ACCESS_TOKEN)
        expect(output).not.toContain(APP_SECRET)
        expect(output).not.toContain(PROOF)
        expect(output).not.toContain("graph.facebook.com")
    })

    describe("inspectAccessToken", () => {
        const UNKNOWN = { kind: "UNKNOWN", expiresAt: null }

        function debugResponse(data: unknown) {
            return jsonResponse(200, { data })
        }

        it("consulta o debug_token com o proprio token, o Bearer e o appsecret_proof", async () => {
            const fetchFn = fetchSequence(debugResponse({ is_valid: true, expires_at: 0 }))

            await createMetaGraphClient({ fetchFn }).inspectAccessToken(input)

            expect(fetchFn).toHaveBeenCalledTimes(1)
            const [url, init] = fetchFn.mock.calls[0] ?? []
            expect(url).toBe(
                `https://graph.facebook.com/v26.0/debug_token?input_token=${ACCESS_TOKEN}&appsecret_proof=${PROOF}`,
            )
            expect(init?.method).toBe("GET")
            expect(init?.headers).toEqual({ Authorization: `Bearer ${ACCESS_TOKEN}` })
            expect(init?.signal).toBeInstanceOf(AbortSignal)
        })

        it("usa o tempo limite proprio de 5 segundos", () => {
            expect(META_TOKEN_INSPECTION_TIMEOUT_MS).toBe(5_000)
        })

        it("devolve PERMANENT quando a Meta diz que o token valido nao expira", async () => {
            const fetchFn = fetchSequence(debugResponse({ is_valid: true, expires_at: 0, type: "SYSTEM_USER", scopes: ["whatsapp_business_messaging"] }))

            const result = await createMetaGraphClient({ fetchFn }).inspectAccessToken(input)

            expect(result).toEqual({ kind: "PERMANENT", expiresAt: null })
        })

        it("devolve EXPIRING com a data em ISO quando a Meta devolve a expiracao", async () => {
            const fetchFn = fetchSequence(debugResponse({ is_valid: true, expires_at: 1792152000, user_id: "123" }))

            const result = await createMetaGraphClient({ fetchFn }).inspectAccessToken(input)

            expect(result).toEqual({ kind: "EXPIRING", expiresAt: new Date(1792152000 * 1000).toISOString() })
        })

        it.each([
            ["is_valid false", debugResponse({ is_valid: false, expires_at: 0 })],
            ["is_valid ausente", debugResponse({ expires_at: 0 })],
            ["is_valid como texto", debugResponse({ is_valid: "true", expires_at: 0 })],
            ["expires_at ausente", debugResponse({ is_valid: true })],
            ["expires_at negativo", debugResponse({ is_valid: true, expires_at: -1 })],
            ["expires_at fracionario", debugResponse({ is_valid: true, expires_at: 1.5 })],
            ["expires_at como texto", debugResponse({ is_valid: true, expires_at: "0" })],
            ["expires_at fora do intervalo de datas", debugResponse({ is_valid: true, expires_at: 9e15 })],
            ["data ausente", jsonResponse(200, {})],
            ["data que nao e objeto", jsonResponse(200, { data: "texto" })],
            ["HTTP 400", graphError(100)],
            ["HTTP 500", jsonResponse(500, {})],
        ])("devolve UNKNOWN para %s", async (_label, response) => {
            const fetchFn = fetchSequence(response)

            const result = await createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } }).inspectAccessToken(input)

            expect(result).toEqual(UNKNOWN)
        })

        it("devolve UNKNOWN quando o corpo nao e JSON", async () => {
            const fetchFn = vi.fn<FetchFn>().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => {
                    throw new SyntaxError("Unexpected token")
                },
            })

            const result = await createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } }).inspectAccessToken(input)

            expect(result).toEqual(UNKNOWN)
        })

        it("devolve UNKNOWN em erro de rede sem lancar", async () => {
            const fetchFn = vi.fn<FetchFn>().mockRejectedValue(new TypeError(`fetch failed ${ACCESS_TOKEN}`))

            const result = await createMetaGraphClient({ fetchFn, logger: { log: vi.fn() } }).inspectAccessToken(input)

            expect(result).toEqual(UNKNOWN)
        })

        it("devolve UNKNOWN quando a Meta nao responde no tempo limite da inspecao", async () => {
            const fetchFn = vi.fn<FetchFn>(
                (_url, init) =>
                    new Promise((_resolve, reject) => {
                        init.signal?.addEventListener("abort", () => reject(init.signal?.reason))
                    }),
            )

            const result = await createMetaGraphClient({
                fetchFn,
                timeoutMs: 60_000,
                inspectionTimeoutMs: 5,
                logger: { log: vi.fn() },
            }).inspectAccessToken(input)

            expect(result).toEqual(UNKNOWN)
        })

        it("loga a falha so com evento, resultado, status e codigo", async () => {
            const logger = { log: vi.fn() }
            const fetchFn = fetchSequence(graphError(190, { message: `Token ${ACCESS_TOKEN} invalido` }))

            await createMetaGraphClient({ fetchFn, logger }).inspectAccessToken(input)

            expect(logger.log).toHaveBeenCalledTimes(1)
            expect(JSON.parse(String(logger.log.mock.calls[0]?.[0]))).toEqual({
                event: "meta_token_inspection",
                outcome: "unknown",
                status: 400,
                code: 190,
            })
        })

        it("nao loga nada quando descobre o tipo do token", async () => {
            const logger = { log: vi.fn() }
            const fetchFn = fetchSequence(debugResponse({ is_valid: true, expires_at: 0 }))

            await createMetaGraphClient({ fetchFn, logger }).inspectAccessToken(input)

            expect(logger.log).not.toHaveBeenCalled()
        })

        it("nao loga token, App Secret, prova, URL nem o erro capturado em nenhuma falha", async () => {
            const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
            const failures: FetchFn[] = [
                vi.fn<FetchFn>().mockRejectedValue(new TypeError(`fetch failed https://graph.facebook.com/v26.0/debug_token?input_token=${ACCESS_TOKEN}&appsecret_proof=${PROOF}`)),
                fetchSequence(graphError(190, { message: `Token ${ACCESS_TOKEN} invalido` })),
                fetchSequence(debugResponse({ is_valid: false, expires_at: 0, error: { message: ACCESS_TOKEN } })),
                fetchSequence(debugResponse({ is_valid: true, expires_at: 9e15 })),
            ]

            for (const fetchFn of failures) {
                await createMetaGraphClient({ fetchFn }).inspectAccessToken(input)
            }

            const output = loggedOutput(logSpy) + loggedOutput(errorSpy)
            expect(logSpy).toHaveBeenCalledTimes(failures.length)
            expect(output).not.toContain(ACCESS_TOKEN)
            expect(output).not.toContain(APP_SECRET)
            expect(output).not.toContain(PROOF)
            expect(output).not.toContain("input_token")
            expect(output).not.toContain("graph.facebook.com")
            expect(output).not.toContain("fetch failed")
        })
    })
})
