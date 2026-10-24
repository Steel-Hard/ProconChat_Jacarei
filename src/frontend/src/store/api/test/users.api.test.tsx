import { afterEach, describe, expect, it, vi } from "vitest"
import APPOINTMENT_LIST_DEFAULTS from "@/utils/appointmentListDefaults"
import type UserAccount from "@/types/users/UserAccount.types"

const ADMIN: UserAccount = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    active: true,
    permissions: [],
    lastLoginAt: null,
    permissionsUpdatedAt: null,
    permissionsUpdatedBy: null
}

const BRUNO: UserAccount = {
    ...ADMIN,
    id: 7,
    name: "Bruno Lima",
    email: "bruno@exemplo.gov.br",
    isAdmin: false,
    permissions: ["appointments.view"]
}

const LIST = { items: [ADMIN, BRUNO], lastChange: null }

type Reply = { status: number; body: unknown }

function jsonResponse({ status, body }: Reply) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

async function setup(
    reply: (request: Request) => Reply = () => ({ status: 200, body: { data: LIST } })
) {
    vi.stubEnv("VITE_API_URL", "https://api.example.com")
    vi.resetModules()
    const fetchMock = vi.fn(async (input: Request) => jsonResponse(reply(input)))
    vi.stubGlobal("fetch", fetchMock)
    const { default: usersApi } = await import("@/store/api/users.api")
    const { default: createStore } = await import("@/store/createStore")
    const store = createStore()

    return { usersApi, store, fetchMock }
}

function requestAt(fetchMock: ReturnType<typeof vi.fn>, index: number): Request {
    return fetchMock.mock.calls[index][0] as Request
}

async function bodyAt(fetchMock: ReturnType<typeof vi.fn>, index: number): Promise<unknown> {
    return JSON.parse(await requestAt(fetchMock, index).clone().text())
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("usersApi", () => {
    it("lê GET /api/v1/users com as credenciais e devolve o data do envelope", async () => {
        const { usersApi, store, fetchMock } = await setup()

        const result = await store.dispatch(usersApi.endpoints.getUsers.initiate())

        expect(result.data).toEqual(LIST)
        expect(requestAt(fetchMock, 0).method).toBe("GET")
        expect(requestAt(fetchMock, 0).url).toBe("https://api.example.com/api/v1/users")
        expect(requestAt(fetchMock, 0).credentials).toBe("include")
    })

    it("salva o lote com PATCH /api/v1/users e devolve o resultado", async () => {
        const saved = { ...LIST, redistributed: 0 }
        const { usersApi, store, fetchMock } = await setup(() => ({
            status: 200,
            body: { data: saved }
        }))
        const changes = [{ userId: 7, active: false, reassignment: { mode: "pending" as const } }]

        const result = await store.dispatch(
            usersApi.endpoints.saveUserChanges.initiate({ changes })
        )

        expect(result.data).toEqual(saved)
        expect(requestAt(fetchMock, 0).method).toBe("PATCH")
        expect(requestAt(fetchMock, 0).url).toBe("https://api.example.com/api/v1/users")
        expect(await bodyAt(fetchMock, 0)).toEqual({ changes })
    })

    it("depois de salvar, a lista em cache traz os itens e a última alteração da resposta sem nova requisição", async () => {
        const updated = {
            items: [ADMIN, { ...BRUNO, active: false }],
            lastChange: { name: "Ana Paula Souza", at: "2026-10-20T13:00:00.000Z" },
            redistributed: 0
        }
        const { usersApi, store, fetchMock } = await setup((request) =>
            request.method === "PATCH"
                ? { status: 200, body: { data: updated } }
                : { status: 200, body: { data: LIST } }
        )
        const subscription = store.dispatch(usersApi.endpoints.getUsers.initiate())
        await subscription

        await store.dispatch(
            usersApi.endpoints.saveUserChanges.initiate({ changes: [{ userId: 7, active: false }] })
        )

        expect(usersApi.endpoints.getUsers.select()(store.getState()).data).toEqual({
            items: updated.items,
            lastChange: updated.lastChange
        })
        expect(fetchMock).toHaveBeenCalledTimes(2)
        subscription.unsubscribe()
    })

    it("invalida a lista, o contador e o detalhe dos agendamentos só quando redistribuiu", async () => {
        let redistributed = 0
        const { usersApi, store, fetchMock } = await setup((request) =>
            request.method === "PATCH"
                ? { status: 200, body: { data: { ...LIST, redistributed } } }
                : { status: 200, body: { data: { count: 0 } } }
        )
        const { default: appointmentsApi } = await import("@/store/api/appointments.api")
        const subscriptions = [
            store.dispatch(appointmentsApi.endpoints.getPendingAppointmentsCount.initiate()),
            store.dispatch(appointmentsApi.endpoints.getAppointment.initiate("11")),
            store.dispatch(
                appointmentsApi.endpoints.getAppointments.initiate(APPOINTMENT_LIST_DEFAULTS)
            )
        ]
        await Promise.all(subscriptions)
        const appointmentReads = () =>
            fetchMock.mock.calls.filter(([input]) => input.url.includes("/api/v1/appointments"))
                .length

        await store.dispatch(
            usersApi.endpoints.saveUserChanges.initiate({ changes: [{ userId: 7, active: true }] })
        )
        await new Promise((resolve) => setTimeout(resolve, 20))
        const afterNoRedistribution = appointmentReads()
        redistributed = 2
        await store.dispatch(
            usersApi.endpoints.saveUserChanges.initiate({ changes: [{ userId: 7, active: false }] })
        )

        expect(afterNoRedistribution).toBe(3)
        await vi.waitFor(() => expect(appointmentReads()).toBe(6))
        subscriptions.forEach((subscription) => subscription.unsubscribe())
    })

    it("lê os agendamentos futuros da conta e busca de novo a cada chamada", async () => {
        const future = [
            {
                id: "11",
                protocol: "AB12CD34",
                name: "Maria Souza",
                appointmentDatetime: "2026-10-30T13:00:00.000Z",
                status: "CONFIRMED"
            }
        ]
        const { usersApi, store, fetchMock } = await setup(() => ({
            status: 200,
            body: { data: future }
        }))
        const load = () =>
            store
                .dispatch(
                    usersApi.endpoints.getFutureAppointments.initiate(7, {
                        forceRefetch: true,
                        subscribe: false
                    })
                )
                .unwrap()

        const result = await load()
        await load()

        expect(result).toEqual(future)
        expect(requestAt(fetchMock, 0).method).toBe("GET")
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/users/7/future-appointments"
        )
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("devolve o corpo do erro com details para a tela", async () => {
        const errorBody = {
            error: { code: "PERMISSION_NOT_HELD", message: "x", details: { userId: 7 } }
        }
        const { usersApi, store } = await setup(() => ({ status: 403, body: errorBody }))

        const result = await store.dispatch(
            usersApi.endpoints.saveUserChanges.initiate({ changes: [{ userId: 7, active: false }] })
        )

        expect(result.error).toEqual({ status: 403, data: errorBody })
    })
})
