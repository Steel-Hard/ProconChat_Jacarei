import { afterEach, describe, expect, it, vi } from "vitest"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"
import type AppointmentList from "@/types/appointments/AppointmentList.types"
import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"

const DEFAULT_FILTERS: AppointmentListFilters = {
    status: "all",
    period: "upcoming",
    responsible: "all",
    page: 1
}

const LIST: AppointmentList = {
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    chipCounts: {
        all: 0,
        pending: 0,
        confirmed: 0,
        attended: 0,
        no_show: 0,
        canceled: 0,
        waiting_record: 0
    }
}

const DETAIL = {
    id: "7",
    protocol: "AG-0007",
    status: "CONFIRMED",
    assigned_user_name: "Ana Paula Souza"
} as AppointmentDetail

type Reply = { status: number; body?: unknown }

function respond({ status, body }: Reply): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

async function setup(patchReply: Reply = { status: 200, body: { data: DETAIL } }) {
    vi.stubEnv("VITE_API_URL", "https://api.example.com")
    vi.resetModules()
    const fetchMock = vi.fn(async (input: Request) => {
        const path = new URL(input.url).pathname

        if (input.method === "PATCH") {
            return respond(patchReply)
        }

        if (path.endsWith("/pending-count")) {
            return respond({ status: 200, body: { data: { count: 4 } } })
        }

        if (path === "/api/v1/appointments") {
            return respond({ status: 200, body: { data: LIST } })
        }

        return respond({ status: 200, body: { data: { ...DETAIL, status: "PENDING" } } })
    })
    vi.stubGlobal("fetch", fetchMock)
    const { default: appointmentsApi } = await import("@/store/api/appointments.api")
    const { default: createStore } = await import("@/store/createStore")
    const store = createStore()

    return { appointmentsApi, store, fetchMock }
}

function requestAt(fetchMock: ReturnType<typeof vi.fn>, index: number): Request {
    return fetchMock.mock.calls[index][0] as Request
}

function requestsTo(fetchMock: ReturnType<typeof vi.fn>, method: string, path: string): number {
    return fetchMock.mock.calls.filter(([input]) => {
        const request = input as Request

        return request.method === method && new URL(request.url).pathname === path
    }).length
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("appointmentsApi", () => {
    it("pede a lista com os filtros padrão, limit 20 e sem ordem nem busca", async () => {
        const { appointmentsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            appointmentsApi.endpoints.getAppointments.initiate(DEFAULT_FILTERS)
        )

        expect(result.data).toEqual(LIST)
        expect(requestAt(fetchMock, 0).method).toBe("GET")
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/appointments?status=all&period=upcoming&responsible=all&page=1&limit=20"
        )
        expect(requestAt(fetchMock, 0).credentials).toBe("include")
    })

    it("manda a busca com 2 caracteres ou mais, sem os espaços das pontas", async () => {
        const { appointmentsApi, store, fetchMock } = await setup()

        await store.dispatch(
            appointmentsApi.endpoints.getAppointments.initiate({
                ...DEFAULT_FILTERS,
                search: " ma "
            })
        )

        expect(new URL(requestAt(fetchMock, 0).url).searchParams.get("search")).toBe("ma")
    })

    it("não manda a busca com menos de 2 caracteres depois do trim", async () => {
        const { appointmentsApi, store, fetchMock } = await setup()

        await store.dispatch(
            appointmentsApi.endpoints.getAppointments.initiate({
                ...DEFAULT_FILTERS,
                search: " m "
            })
        )

        expect(new URL(requestAt(fetchMock, 0).url).searchParams.has("search")).toBe(false)
    })

    it("manda sortBy e sortOrder quando a ordem foi escolhida", async () => {
        const { appointmentsApi, store, fetchMock } = await setup()

        await store.dispatch(
            appointmentsApi.endpoints.getAppointments.initiate({
                ...DEFAULT_FILTERS,
                status: "PENDING",
                period: "all",
                responsible: "me",
                sortBy: "name",
                sortOrder: "desc",
                page: 3
            })
        )

        const params = new URL(requestAt(fetchMock, 0).url).searchParams
        expect(params.get("status")).toBe("PENDING")
        expect(params.get("period")).toBe("all")
        expect(params.get("responsible")).toBe("me")
        expect(params.get("sortBy")).toBe("name")
        expect(params.get("sortOrder")).toBe("desc")
        expect(params.get("page")).toBe("3")
        expect(params.get("limit")).toBe("20")
    })

    it("devolve o número de pendentes de data.count", async () => {
        const { appointmentsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            appointmentsApi.endpoints.getPendingAppointmentsCount.initiate()
        )

        expect(result.data).toBe(4)
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/appointments/pending-count"
        )
    })

    it("lê o detalhe em GET /api/v1/appointments/:id", async () => {
        const { appointmentsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(appointmentsApi.endpoints.getAppointment.initiate("7"))

        expect(result.data?.status).toBe("PENDING")
        expect(requestAt(fetchMock, 0).url).toBe("https://api.example.com/api/v1/appointments/7")
    })

    it("manda PATCH /:id/status com o corpo da ação e devolve o detalhe", async () => {
        const { appointmentsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            appointmentsApi.endpoints.updateAppointmentStatus.initiate({ id: "7", action: "claim" })
        )

        expect(result.data).toEqual(DETAIL)
        expect(requestAt(fetchMock, 0).method).toBe("PATCH")
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/appointments/7/status"
        )
        expect(await requestAt(fetchMock, 0).text()).toBe('{"action":"claim"}')
    })

    it("no sucesso grava o detalhe no cache sem novo GET e refaz a lista e o contador", async () => {
        const { appointmentsApi, store, fetchMock } = await setup()
        const detail = store.dispatch(appointmentsApi.endpoints.getAppointment.initiate("7"))
        const list = store.dispatch(
            appointmentsApi.endpoints.getAppointments.initiate(DEFAULT_FILTERS)
        )
        const count = store.dispatch(
            appointmentsApi.endpoints.getPendingAppointmentsCount.initiate()
        )
        await Promise.all([detail, list, count])

        await store.dispatch(
            appointmentsApi.endpoints.updateAppointmentStatus.initiate({ id: "7", action: "claim" })
        )

        await vi.waitFor(() => {
            expect(requestsTo(fetchMock, "GET", "/api/v1/appointments")).toBe(2)
            expect(requestsTo(fetchMock, "GET", "/api/v1/appointments/pending-count")).toBe(2)
        })
        expect(requestsTo(fetchMock, "GET", "/api/v1/appointments/7")).toBe(1)
        expect(
            appointmentsApi.endpoints.getAppointment.select("7")(store.getState()).data?.status
        ).toBe("CONFIRMED")
        detail.unsubscribe()
        list.unsubscribe()
        count.unsubscribe()
    })

    it("com 409 refaz a lista e o contador, mas não o detalhe", async () => {
        const { appointmentsApi, store, fetchMock } = await setup({
            status: 409,
            body: { error: { code: "APPOINTMENT_ALREADY_CLAIMED", message: "x" } }
        })
        const detail = store.dispatch(appointmentsApi.endpoints.getAppointment.initiate("7"))
        const list = store.dispatch(
            appointmentsApi.endpoints.getAppointments.initiate(DEFAULT_FILTERS)
        )
        const count = store.dispatch(
            appointmentsApi.endpoints.getPendingAppointmentsCount.initiate()
        )
        await Promise.all([detail, list, count])

        const result = await store.dispatch(
            appointmentsApi.endpoints.updateAppointmentStatus.initiate({ id: "7", action: "claim" })
        )

        expect(result.error).toMatchObject({ status: 409 })
        await vi.waitFor(() => {
            expect(requestsTo(fetchMock, "GET", "/api/v1/appointments")).toBe(2)
            expect(requestsTo(fetchMock, "GET", "/api/v1/appointments/pending-count")).toBe(2)
        })
        expect(requestsTo(fetchMock, "GET", "/api/v1/appointments/7")).toBe(1)
        expect(
            appointmentsApi.endpoints.getAppointment.select("7")(store.getState()).data?.status
        ).toBe("PENDING")
        detail.unsubscribe()
        list.unsubscribe()
        count.unsubscribe()
    })
})
