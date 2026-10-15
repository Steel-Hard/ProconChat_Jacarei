import type { ReactNode } from "react"
import { Provider } from "react-redux"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type useWhatsAppSettingsHook from "@/pages/hooks/useWhatsAppSettings"
import type WhatsAppSettings from "@/types/whatsapp/WhatsAppSettings.types"

const NEW_TOKEN = "EAAG-token-novo-ficticio-77Zz"
const UNKNOWN_LIFETIME = { kind: "UNKNOWN", expiresAt: null } as const

function settingsView(overrides: Partial<WhatsAppSettings> = {}): WhatsAppSettings {
    return {
        phoneNumberId: "100000000000001",
        businessAccountId: "200000000000002",
        accessToken: { configured: true, last4: "a91F" },
        appSecret: { configured: true, last4: "9c2e" },
        verifyToken: "3f9a".repeat(16),
        webhookUrl: "https://exemplo.sslip.io/webhooks/whatsapp",
        graphApiVersion: "v26.0",
        credentialsValid: true,
        credentialsCheckedAt: "2026-10-14T13:00:00.000Z",
        autoReplyPaused: false,
        pausedMessage: "Mensagem fixa de pausa",
        updatedBy: { id: 1, name: "Ana Paula" },
        updatedAt: "2026-10-14T13:00:00.000Z",
        displayPhoneNumber: "+55 12 3955-9000",
        verifiedName: "PROCON Jacareí",
        accessTokenLifetime: UNKNOWN_LIFETIME,
        ...overrides
    }
}

type Reply = { status: number; body?: unknown } | Promise<{ status: number; body?: unknown }>
type Handler = (body: unknown) => Reply

type Call = { method: string; path: string; body: unknown }

type Release = (value: { status: number; body: unknown }) => void

function noRelease() {}

type HookResult = { current: ReturnType<typeof useWhatsAppSettingsHook> }

function respond(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

function stubApi(handlers: Record<string, Handler>) {
    const calls: Call[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : null
        const url = request ? request.url : String(input)
        const method = request ? request.method : (init?.method ?? "GET")
        const path = new URL(url, "http://localhost").pathname
        const rawBody = request ? null : init?.body
        const body = typeof rawBody === "string" ? JSON.parse(rawBody) : undefined
        calls.push({ method, path, body })
        const handler = handlers[`${method} ${path}`]

        if (!handler) {
            return respond(404, { error: { code: "NOT_FOUND", message: "x" } })
        }

        const reply = await handler(body)

        return respond(reply.status, reply.body)
    })
    vi.stubGlobal("fetch", fetchMock)

    return { calls, fetchMock }
}

async function setup(handlers: Record<string, Handler> = {}, view = settingsView()) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const api = stubApi({
        "GET /api/v1/whatsapp/settings": () => ({ status: 200, body: { data: view } }),
        ...handlers
    })
    const { default: createStore } = await import("@/store/createStore")
    const { default: ToastProvider } = await import("@/components/ToastProvider")
    const { default: useWhatsAppSettings } = await import("@/pages/hooks/useWhatsAppSettings")
    const store = createStore()
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>
            <ToastProvider>{children}</ToastProvider>
        </Provider>
    )
    const rendered = renderHook(() => useWhatsAppSettings(), { wrapper })

    return { ...api, ...rendered, store }
}

async function ready(result: HookResult) {
    await waitFor(() => expect(result.current.status).toBe("ready"))
}

function callsTo(calls: Call[], method: string, path: string): Call[] {
    return calls.filter((call) => call.method === method && call.path === path)
}

function expiring(expiresAt: string) {
    return { kind: "EXPIRING", expiresAt } as const
}

function okTest(lifetime: unknown): Handler {
    return () => ({
        status: 200,
        body: {
            data: {
                ok: true,
                displayPhoneNumber: "+55",
                verifiedName: "X",
                checkedAt: "x",
                accessTokenLifetime: lifetime
            }
        }
    })
}

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("useWhatsAppSettings", () => {
    it("começa carregando e fica pronto com os IDs do servidor e sem alterações", async () => {
        const { result } = await setup()

        expect(result.current.status).toBe("loading")
        await ready(result)

        expect(result.current.phoneNumberId).toBe("100000000000001")
        expect(result.current.businessAccountId).toBe("200000000000002")
        expect(result.current.changes).toEqual([])
    })

    it("fica em erro quando a leitura falha", async () => {
        const { result } = await setup({
            "GET /api/v1/whatsapp/settings": () => ({
                status: 500,
                body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
            })
        })

        await waitFor(() => expect(result.current.status).toBe("error"))
    })

    it("não conta como alteração o ID que volta ao valor salvo ignorando espaços nas pontas", async () => {
        const { result } = await setup()
        await ready(result)

        act(() => result.current.setPhoneNumberId("100000000000009"))
        const changed = result.current.changes
        act(() => result.current.setPhoneNumberId("  100000000000001 "))

        expect(changed).toEqual(["ID do número de telefone"])
        expect(result.current.changes).toEqual([])
    })

    it("lista os nomes dos campos alterados, contando o segredo só quando há valor novo", async () => {
        const { result } = await setup()
        await ready(result)

        act(() => result.current.setBusinessAccountId("200000000000003"))
        act(() => result.current.replaceSecret("accessToken"))
        const whileEmpty = result.current.changes
        act(() => result.current.setSecret("accessToken", NEW_TOKEN))

        expect(whileEmpty).toEqual(["ID da conta WhatsApp Business"])
        expect(result.current.changes).toEqual(["ID da conta WhatsApp Business", "Token de acesso"])
    })

    it("testa com os IDs atuais e só o segredo substituído, deixando o outro null", async () => {
        const { result, calls } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55 12 3955-9000",
                        verifiedName: "PROCON Jacareí",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            })
        })
        await ready(result)
        act(() => result.current.replaceSecret("accessToken"))
        act(() => result.current.setSecret("accessToken", NEW_TOKEN))

        await act(() => result.current.runTest())

        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")[0]?.body).toEqual({
            phoneNumberId: "100000000000001",
            businessAccountId: "200000000000002",
            accessToken: NEW_TOKEN,
            appSecret: null
        })
        expect(result.current.testResult).toEqual({
            kind: "ok",
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
            accessTokenLifetime: UNKNOWN_LIFETIME
        })
        expect(result.current.saveDisabled).toBe(false)
    })

    it("mostra o texto do motivo quando a Meta recusa o teste", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: false,
                        reason: "INVALID_TOKEN",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            })
        })
        await ready(result)

        await act(() => result.current.runTest())

        expect(result.current.testResult).toEqual({
            kind: "failed",
            message: "Token inválido ou expirado"
        })
    })

    it("fica testando e desabilita novo teste até a resposta chegar", async () => {
        let release: Release = noRelease
        const { result, calls } = await setup({
            "POST /api/v1/whatsapp/settings/test": () =>
                new Promise((resolve) => {
                    release = resolve
                })
        })
        await ready(result)

        let pending: Promise<void> = Promise.resolve()
        act(() => {
            pending = result.current.runTest()
        })
        await waitFor(() => expect(result.current.testing).toBe(true))
        await act(() => result.current.runTest())
        release({
            status: 200,
            body: {
                data: {
                    ok: false,
                    reason: "META_ERROR",
                    checkedAt: "x",
                    accessTokenLifetime: UNKNOWN_LIFETIME
                }
            }
        })
        await act(() => pending)

        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")).toHaveLength(1)
        expect(result.current.testing).toBe(false)
    })

    it("descarta o resultado do teste que chega depois de o formulário mudar", async () => {
        let release: Release = noRelease
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () =>
                new Promise((resolve) => {
                    release = resolve
                })
        })
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))

        let pending: Promise<void> = Promise.resolve()
        act(() => {
            pending = result.current.runTest()
        })
        act(() => result.current.setPhoneNumberId("100000000000008"))
        release({
            status: 200,
            body: {
                data: {
                    ok: true,
                    displayPhoneNumber: "+55",
                    verifiedName: "X",
                    checkedAt: "x",
                    accessTokenLifetime: UNKNOWN_LIFETIME
                }
            }
        })
        await act(() => pending)

        expect(result.current.testResult).toBeNull()
        expect(result.current.saveDisabled).toBe(true)
    })

    it("invalida o teste ok quando um campo muda e o revalida ao voltar aos mesmos valores", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55",
                        verifiedName: "X",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            })
        })
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))
        await act(() => result.current.runTest())

        act(() => result.current.setPhoneNumberId("100000000000008"))
        const afterEdit = {
            testResult: result.current.testResult,
            saveDisabled: result.current.saveDisabled,
            needTest: result.current.needTest
        }
        act(() => result.current.setPhoneNumberId("100000000000009"))

        expect(afterEdit).toEqual({ testResult: null, saveDisabled: true, needTest: true })
        expect(result.current.testResult?.kind).toBe("ok")
        expect(result.current.saveDisabled).toBe(false)
    })

    it("editar o segredo depois de um teste ok invalida o resultado, mesmo voltando ao valor testado", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55",
                        verifiedName: "X",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            })
        })
        await ready(result)
        act(() => result.current.replaceSecret("accessToken"))
        act(() => result.current.setSecret("accessToken", NEW_TOKEN))
        await act(() => result.current.runTest())
        const tested = result.current.testResult?.kind

        act(() => result.current.setSecret("accessToken", `${NEW_TOKEN}x`))
        act(() => result.current.setSecret("accessToken", NEW_TOKEN))

        expect(tested).toBe("ok")
        expect(result.current.testResult).toBeNull()
        expect(result.current.saveDisabled).toBe(true)
    })

    it("cancelar a substituição depois do teste ok invalida o resultado", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55",
                        verifiedName: "X",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            })
        })
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))
        act(() => result.current.replaceSecret("accessToken"))
        act(() => result.current.setSecret("accessToken", NEW_TOKEN))
        await act(() => result.current.runTest())

        act(() => result.current.cancelSecret("accessToken"))

        expect(result.current.testResult).toBeNull()
        expect(result.current.saveDisabled).toBe(true)
    })

    it("não chama a API e pede o campo quando o ID da conta está vazio", async () => {
        const { result, calls } = await setup()
        await ready(result)
        act(() => result.current.setBusinessAccountId("   "))

        await act(() => result.current.runTest())

        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")).toHaveLength(0)
        expect(result.current.testResult).toEqual({
            kind: "failed",
            message:
                'Preencha o campo "ID da conta WhatsApp Business" ou cancele a substituição antes de testar.'
        })
    })

    it("não chama a API quando uma substituição está vazia", async () => {
        const { result, calls } = await setup()
        await ready(result)
        act(() => result.current.replaceSecret("appSecret"))

        await act(() => result.current.runTest())

        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")).toHaveLength(0)
        expect(result.current.testResult).toEqual({
            kind: "failed",
            message: 'Preencha o campo "App Secret" ou cancele a substituição antes de testar.'
        })
    })

    it("exige o segredo que ainda não foi configurado", async () => {
        const { result, calls } = await setup(
            {},
            settingsView({ accessToken: { configured: false, last4: null } })
        )
        await ready(result)

        await act(() => result.current.runTest())

        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")).toHaveLength(0)
        expect(result.current.testResult).toEqual({
            kind: "failed",
            message: 'Preencha o campo "Token de acesso" ou cancele a substituição antes de testar.'
        })
    })

    it.each([
        ["12a45", 'Use só números no campo "ID do número de telefone" (até 40 dígitos).'],
        ["1".repeat(41), 'Use só números no campo "ID do número de telefone" (até 40 dígitos).']
    ])("recusa o ID %s sem chamar a API", async (value, message) => {
        const { result, calls } = await setup()
        await ready(result)
        act(() => result.current.setPhoneNumberId(value))

        await act(() => result.current.runTest())

        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")).toHaveLength(0)
        expect(result.current.testResult).toEqual({ kind: "failed", message })
    })

    it("recusa segredo com espaço sem chamar a API", async () => {
        const { result, calls } = await setup()
        await ready(result)
        act(() => result.current.replaceSecret("appSecret"))
        act(() => result.current.setSecret("appSecret", "segredo com espaco"))

        await act(() => result.current.runTest())

        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")).toHaveLength(0)
        expect(result.current.testResult).toEqual({
            kind: "failed",
            message: 'O campo "App Secret" não pode ter espaços.'
        })
    })

    it.each([
        [400, "BAD_REQUEST", "Não foi possível testar agora. Tente de novo."],
        [
            403,
            "INVALID_ORIGIN",
            "O painel foi aberto por um endereço não autorizado. Acesse pelo endereço oficial do painel."
        ],
        [503, "SERVICE_UNAVAILABLE", "Não foi possível testar agora. Tente de novo."]
    ])("mostra erro claro quando o teste recebe %i", async (status, code, message) => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status,
                body: { error: { code, message: "x" } }
            })
        })
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))

        await act(() => result.current.runTest())

        expect(result.current.testResult).toEqual({ kind: "error", message })
        expect(result.current.phoneNumberId).toBe("100000000000009")
    })

    it("mostra erro claro quando o teste falha na rede", async () => {
        const { result, fetchMock } = await setup()
        await ready(result)
        fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))

        await act(() => result.current.runTest())

        expect(result.current.testResult).toEqual({
            kind: "error",
            message: "Não foi possível testar agora. Tente de novo."
        })
    })

    it("salva com o mesmo corpo do teste, atualiza a leitura e limpa rascunho e teste", async () => {
        const saved = settingsView({ accessToken: { configured: true, last4: "77Zz" } })
        const { result, calls } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55",
                        verifiedName: "X",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            }),
            "PUT /api/v1/whatsapp/settings": () => ({ status: 200, body: { data: saved } })
        })
        await ready(result)
        act(() => result.current.replaceSecret("accessToken"))
        act(() => result.current.setSecret("accessToken", NEW_TOKEN))
        await act(() => result.current.runTest())

        await act(() => result.current.save())

        const [testCall] = callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")
        const [saveCall] = callsTo(calls, "PUT", "/api/v1/whatsapp/settings")
        expect(saveCall?.body).toEqual(testCall?.body)
        expect(result.current.secrets.accessToken).toEqual({
            configured: true,
            last4: "77Zz",
            value: null
        })
        expect(result.current.changes).toEqual([])
        expect(result.current.testResult).toBeNull()
        expect(callsTo(calls, "GET", "/api/v1/whatsapp/settings")).toHaveLength(1)
    })

    it("não salva sem um teste bem-sucedido com os valores atuais", async () => {
        const { result, calls } = await setup()
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))

        await act(() => result.current.save())

        expect(callsTo(calls, "PUT", "/api/v1/whatsapp/settings")).toHaveLength(0)
        expect(result.current.saveDisabled).toBe(true)
    })

    it("no 422 mantém o rascunho, invalida o teste e mostra o motivo", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55",
                        verifiedName: "X",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            }),
            "PUT /api/v1/whatsapp/settings": () => ({
                status: 422,
                body: { error: { code: "MISSING_PERMISSION", message: "x" } }
            })
        })
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))
        await act(() => result.current.runTest())

        await act(() => result.current.save())

        expect(result.current.phoneNumberId).toBe("100000000000009")
        expect(result.current.testResult).toEqual({
            kind: "failed",
            message: "O token não tem permissão para gerenciar este número"
        })
        expect(result.current.saveDisabled).toBe(true)
    })

    it("no 422 com motivo desconhecido usa o texto de recusa da Meta", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55",
                        verifiedName: "X",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            }),
            "PUT /api/v1/whatsapp/settings": () => ({
                status: 422,
                body: { error: { code: "ALGO_NOVO", message: "x" } }
            })
        })
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))
        await act(() => result.current.runTest())

        await act(() => result.current.save())

        expect(result.current.testResult).toEqual({
            kind: "failed",
            message: "A Meta recusou as credenciais"
        })
    })

    it("mostra erro claro e mantém o rascunho quando o salvar falha no servidor", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55",
                        verifiedName: "X",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            }),
            "PUT /api/v1/whatsapp/settings": () => ({
                status: 500,
                body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
            })
        })
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))
        await act(() => result.current.runTest())

        await act(() => result.current.save())

        expect(result.current.actionError).toBe("Não foi possível salvar agora. Tente de novo.")
        expect(result.current.phoneNumberId).toBe("100000000000009")
    })

    it("descartar volta aos valores do servidor, cancela substituições e limpa o teste", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: false,
                        reason: "INVALID_TOKEN",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            })
        })
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))
        act(() => result.current.replaceSecret("appSecret"))
        act(() => result.current.setSecret("appSecret", "segredo-novo"))
        await act(() => result.current.runTest())

        act(() => result.current.discard())

        expect(result.current.phoneNumberId).toBe("100000000000001")
        expect(result.current.secrets.appSecret.value).toBeNull()
        expect(result.current.testResult).toBeNull()
        expect(result.current.changes).toEqual([])
    })

    it("cancelar a substituição volta à máscara e desfaz a alteração daquele campo", async () => {
        const { result } = await setup()
        await ready(result)
        act(() => result.current.replaceSecret("accessToken"))
        act(() => result.current.setSecret("accessToken", NEW_TOKEN))

        act(() => result.current.cancelSecret("accessToken"))

        expect(result.current.secrets.accessToken.value).toBeNull()
        expect(result.current.changes).toEqual([])
    })

    it("pausar e reativar preservam o rascunho e o resultado do teste", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55",
                        verifiedName: "X",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            }),
            "POST /api/v1/whatsapp/settings/pause": () => ({
                status: 200,
                body: { data: settingsView({ autoReplyPaused: true }) }
            }),
            "POST /api/v1/whatsapp/settings/resume": () => ({
                status: 200,
                body: { data: settingsView({ autoReplyPaused: false }) }
            })
        })
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))
        await act(() => result.current.runTest())

        await act(() => result.current.togglePause())
        await act(() => result.current.confirmPause())
        const pausedView = result.current.view?.autoReplyPaused
        await act(() => result.current.togglePause())

        expect(pausedView).toBe(true)
        expect(result.current.view?.autoReplyPaused).toBe(false)
        expect(result.current.phoneNumberId).toBe("100000000000009")
        expect(result.current.testResult?.kind).toBe("ok")
        expect(result.current.saveDisabled).toBe(false)
    })

    it("pausar abre a confirmação e só chama a API ao confirmar", async () => {
        const { result, calls } = await setup({
            "POST /api/v1/whatsapp/settings/pause": () => ({
                status: 200,
                body: { data: settingsView({ autoReplyPaused: true }) }
            })
        })
        await ready(result)

        await act(() => result.current.togglePause())
        const opened = result.current.pauseDialogOpen
        act(() => result.current.closePauseDialog())

        expect(opened).toBe(true)
        expect(result.current.pauseDialogOpen).toBe(false)
        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/pause")).toHaveLength(0)
    })

    it("mantém o estado e mostra erro quando pausar falha", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/pause": () => ({
                status: 500,
                body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
            })
        })
        await ready(result)
        await act(() => result.current.togglePause())

        await act(() => result.current.confirmPause())

        expect(result.current.view?.autoReplyPaused).toBe(false)
        expect(result.current.actionError).toBe("Não foi possível pausar agora. Tente de novo.")
        expect(result.current.pauseDialogOpen).toBe(false)
    })

    it("mantém o estado e mostra erro quando reativar falha", async () => {
        const { result } = await setup(
            {
                "POST /api/v1/whatsapp/settings/resume": () => ({
                    status: 403,
                    body: { error: { code: "INVALID_ORIGIN", message: "x" } }
                })
            },
            settingsView({ autoReplyPaused: true })
        )
        await ready(result)

        await act(() => result.current.togglePause())

        expect(result.current.view?.autoReplyPaused).toBe(true)
        expect(result.current.actionError).toBe(
            "O painel foi aberto por um endereço não autorizado. Acesse pelo endereço oficial do painel."
        )
    })

    it("não mostra erro próprio quando a sessão expira no teste", async () => {
        const { result } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 401,
                body: { error: { code: "UNAUTHORIZED", message: "x" } }
            }),
            "POST /api/v1/auth/refresh": () => ({
                status: 401,
                body: { error: { code: "UNAUTHORIZED", message: "x" } }
            })
        })
        await ready(result)

        await act(() => result.current.runTest())

        expect(result.current.testResult).toBeNull()
        expect(result.current.testing).toBe(false)
    })

    it("enquanto salva fica salvando e não deixa testar nem salvar de novo", async () => {
        let release: Release = noRelease
        const { result, calls } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55",
                        verifiedName: "X",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            }),
            "PUT /api/v1/whatsapp/settings": () =>
                new Promise((resolve) => {
                    release = resolve
                })
        })
        await ready(result)
        act(() => result.current.setPhoneNumberId("100000000000009"))
        await act(() => result.current.runTest())

        let pending: Promise<void> = Promise.resolve()
        act(() => {
            pending = result.current.save()
        })
        await waitFor(() => expect(result.current.saving).toBe(true))
        await act(() => result.current.runTest())
        await act(() => result.current.save())
        release({ status: 200, body: { data: settingsView() } })
        await act(() => pending)

        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/test")).toHaveLength(1)
        expect(callsTo(calls, "PUT", "/api/v1/whatsapp/settings")).toHaveLength(1)
        expect(result.current.saving).toBe(false)
    })

    it("enquanto pausa fica trocando e não envia a pausa duas vezes", async () => {
        let release: Release = noRelease
        const { result, calls } = await setup({
            "POST /api/v1/whatsapp/settings/pause": () =>
                new Promise((resolve) => {
                    release = resolve
                })
        })
        await ready(result)
        await act(() => result.current.togglePause())

        let pending: Promise<void> = Promise.resolve()
        act(() => {
            pending = result.current.confirmPause()
        })
        await waitFor(() => expect(result.current.switching).toBe(true))
        await act(() => result.current.confirmPause())
        release({ status: 200, body: { data: settingsView({ autoReplyPaused: true }) } })
        await act(() => pending)

        expect(callsTo(calls, "POST", "/api/v1/whatsapp/settings/pause")).toHaveLength(1)
        expect(result.current.switching).toBe(false)
        expect(result.current.view?.autoReplyPaused).toBe(true)
    })

    it("não guarda o segredo digitado na store nem no armazenamento do navegador", async () => {
        const saved = settingsView({ accessToken: { configured: true, last4: "77Zz" } })
        const { result, store } = await setup({
            "POST /api/v1/whatsapp/settings/test": () => ({
                status: 200,
                body: {
                    data: {
                        ok: true,
                        displayPhoneNumber: "+55",
                        verifiedName: "X",
                        checkedAt: "x",
                        accessTokenLifetime: UNKNOWN_LIFETIME
                    }
                }
            }),
            "PUT /api/v1/whatsapp/settings": () => ({ status: 200, body: { data: saved } })
        })
        await ready(result)
        act(() => result.current.replaceSecret("accessToken"))
        act(() => result.current.setSecret("accessToken", NEW_TOKEN))
        await act(() => result.current.runTest())
        const duringEdit = JSON.stringify(store.getState())

        await act(() => result.current.save())

        expect(duringEdit).not.toContain(NEW_TOKEN)
        expect(JSON.stringify(store.getState())).not.toContain(NEW_TOKEN)
        expect(JSON.stringify({ ...localStorage })).not.toContain(NEW_TOKEN)
        expect(JSON.stringify({ ...sessionStorage })).not.toContain(NEW_TOKEN)
        expect(document.cookie).not.toContain(NEW_TOKEN)
        expect(JSON.stringify(result.current.secrets)).not.toContain(NEW_TOKEN)
    })

    it("calcula a situação geral na ordem de prioridade", async () => {
        const cases: Array<[Partial<WhatsAppSettings>, string]> = [
            [{ autoReplyPaused: true, phoneNumberId: null, credentialsValid: false }, "PAUSED"],
            [{ phoneNumberId: null, credentialsValid: false }, "NOT_CONFIGURED"],
            [{ credentialsValid: false }, "INVALID_CREDENTIALS"],
            [{ credentialsValid: null }, "NOT_VERIFIED"],
            [{ credentialsValid: true }, "OPERATING"]
        ]

        for (const [overrides, situation] of cases) {
            const { result, unmount } = await setup({}, settingsView(overrides))
            await ready(result)
            expect(result.current.situation).toBe(situation)
            unmount()
        }
    })

    describe("texto do campo do token", () => {
        const NOW = new Date("2026-10-15T12:00:00.000Z")
        const DAY_MS = 24 * 60 * 60 * 1000
        const PERMANENT = { kind: "PERMANENT", expiresAt: null } as const
        const GENERIC = {
            text: "Use um token permanente de usuário do sistema; o token temporário expira em 24 horas.",
            tone: "warning"
        }
        const PERMANENT_HINT = { text: "Token permanente: não expira.", tone: "success" }

        function inDays(days: number): string {
            return new Date(NOW.getTime() + days * DAY_MS).toISOString()
        }

        beforeEach(() => {
            vi.useFakeTimers({ toFake: ["Date"] })
            vi.setSystemTime(NOW)
        })

        it("segue a leitura com token permanente quando não há substituição", async () => {
            const { result } = await setup({}, settingsView({ accessTokenLifetime: PERMANENT }))
            await ready(result)

            expect(result.current.tokenHint).toEqual(PERMANENT_HINT)
        })

        it("mostra o aviso genérico quando a leitura não sabe o tipo do token", async () => {
            const { result } = await setup()
            await ready(result)

            expect(result.current.tokenHint).toEqual(GENERIC)
        })

        it("ao substituir ignora o tipo salvo, segue o teste ok do token novo e volta ao salvo ao cancelar", async () => {
            const { result } = await setup(
                {
                    "POST /api/v1/whatsapp/settings/test": okTest(
                        expiring("2026-10-16T14:00:00.000Z")
                    )
                },
                settingsView({ accessTokenLifetime: PERMANENT })
            )
            await ready(result)

            act(() => result.current.replaceSecret("accessToken"))
            const replacing = result.current.tokenHint
            act(() => result.current.setSecret("accessToken", NEW_TOKEN))
            await act(() => result.current.runTest())
            const tested = result.current.tokenHint
            act(() => result.current.cancelSecret("accessToken"))

            expect(replacing).toEqual(GENERIC)
            expect(tested).toEqual({
                text: "Este token expira em 16/10/2026 às 11:00 (horário de Brasília). Gere um token permanente de usuário do sistema para o chatbot não parar de responder.",
                tone: "danger"
            })
            expect(tested.text).not.toContain(NEW_TOKEN)
            expect(result.current.tokenHint).toEqual(PERMANENT_HINT)
        })

        it("volta ao aviso genérico quando o token muda depois do teste ok", async () => {
            const { result } = await setup({
                "POST /api/v1/whatsapp/settings/test": okTest(PERMANENT)
            })
            await ready(result)
            act(() => result.current.replaceSecret("accessToken"))
            act(() => result.current.setSecret("accessToken", NEW_TOKEN))
            await act(() => result.current.runTest())
            const tested = result.current.tokenHint

            act(() => result.current.setSecret("accessToken", `${NEW_TOKEN}x`))

            expect(tested).toEqual(PERMANENT_HINT)
            expect(result.current.tokenHint).toEqual(GENERIC)
        })

        it("sem token configurado mostra o aviso genérico mesmo com a leitura dizendo permanente", async () => {
            const { result } = await setup(
                {},
                settingsView({
                    accessToken: { configured: false, last4: null },
                    accessTokenLifetime: PERMANENT
                })
            )
            await ready(result)

            expect(result.current.tokenHint).toEqual(GENERIC)
        })

        it("mostra que o token expirou quando a data já passou", async () => {
            const { result } = await setup(
                {},
                settingsView({ accessTokenLifetime: expiring("2026-10-14T23:30:00.000Z") })
            )
            await ready(result)

            expect(result.current.tokenHint).toEqual({
                text: 'Este token expirou em 14/10/2026 às 20:30 (horário de Brasília). Gere um token permanente de usuário do sistema, use "Substituir", teste e salve.',
                tone: "danger"
            })
        })

        it.each([
            [8, "neutral", "Este token expira em 23/10/2026 às 09:00 (horário de Brasília)."],
            [
                7,
                "warning",
                "Este token expira em 22/10/2026 às 09:00 (horário de Brasília). Gere um token permanente de usuário do sistema para o chatbot não parar de responder."
            ],
            [
                4,
                "warning",
                "Este token expira em 19/10/2026 às 09:00 (horário de Brasília). Gere um token permanente de usuário do sistema para o chatbot não parar de responder."
            ],
            [
                3,
                "danger",
                "Este token expira em 18/10/2026 às 09:00 (horário de Brasília). Gere um token permanente de usuário do sistema para o chatbot não parar de responder."
            ]
        ])("com %i dias restantes usa o tom %s", async (days, tone, text) => {
            const { result } = await setup(
                {},
                settingsView({ accessTokenLifetime: expiring(inDays(days)) })
            )
            await ready(result)

            expect(result.current.tokenHint).toEqual({ text, tone })
        })

        it("o teste ok dos valores salvos vale sobre a leitura sem nova leitura", async () => {
            const { result, calls } = await setup({
                "POST /api/v1/whatsapp/settings/test": okTest(PERMANENT)
            })
            await ready(result)

            await act(() => result.current.runTest())

            expect(result.current.tokenHint).toEqual(PERMANENT_HINT)
            expect(callsTo(calls, "GET", "/api/v1/whatsapp/settings")).toHaveLength(1)
        })

        it("o teste ok dos valores salvos sem saber o tipo mantém o tipo da leitura", async () => {
            const { result } = await setup(
                { "POST /api/v1/whatsapp/settings/test": okTest(UNKNOWN_LIFETIME) },
                settingsView({ accessTokenLifetime: PERMANENT })
            )
            await ready(result)

            await act(() => result.current.runTest())

            expect(result.current.tokenHint).toEqual(PERMANENT_HINT)
        })

        it("depois de salvar segue o tipo da leitura devolvida", async () => {
            const { result } = await setup({
                "POST /api/v1/whatsapp/settings/test": okTest(PERMANENT),
                "PUT /api/v1/whatsapp/settings": () => ({
                    status: 200,
                    body: {
                        data: settingsView({
                            accessToken: { configured: true, last4: "77Zz" },
                            accessTokenLifetime: PERMANENT
                        })
                    }
                })
            })
            await ready(result)
            act(() => result.current.replaceSecret("accessToken"))
            act(() => result.current.setSecret("accessToken", NEW_TOKEN))
            await act(() => result.current.runTest())

            await act(() => result.current.save())

            expect(result.current.testResult).toBeNull()
            expect(result.current.tokenHint).toEqual(PERMANENT_HINT)
        })

        it("descartar volta a seguir a leitura", async () => {
            const { result } = await setup(
                { "POST /api/v1/whatsapp/settings/test": okTest(expiring(inDays(2))) },
                settingsView({ accessTokenLifetime: PERMANENT })
            )
            await ready(result)
            act(() => result.current.replaceSecret("accessToken"))
            act(() => result.current.setSecret("accessToken", NEW_TOKEN))
            await act(() => result.current.runTest())
            const tested = result.current.tokenHint.tone

            act(() => result.current.discard())

            expect(tested).toBe("danger")
            expect(result.current.tokenHint).toEqual(PERMANENT_HINT)
        })

        it("no 422 do salvar volta ao aviso genérico do token digitado", async () => {
            const { result } = await setup(
                {
                    "POST /api/v1/whatsapp/settings/test": okTest(PERMANENT),
                    "PUT /api/v1/whatsapp/settings": () => ({
                        status: 422,
                        body: { error: { code: "INVALID_TOKEN", message: "x" } }
                    })
                },
                settingsView({ accessTokenLifetime: PERMANENT })
            )
            await ready(result)
            act(() => result.current.replaceSecret("accessToken"))
            act(() => result.current.setSecret("accessToken", NEW_TOKEN))
            await act(() => result.current.runTest())

            await act(() => result.current.save())

            expect(result.current.tokenHint).toEqual(GENERIC)
        })
    })
})
