import { afterEach, describe, expect, it, vi } from "vitest"
import type MonthlyPreview from "@/types/schedule/MonthlyPreview.types"
import type ScheduleConfigInput from "@/types/schedule/ScheduleConfigInput.types"
import type ScheduleConfigView from "@/types/schedule/ScheduleConfigView.types"

const VIEW: ScheduleConfigView = {
    slotMinutes: 30,
    seatsPerSlot: 2,
    windowDays: 30,
    minNoticeDays: 1,
    waitAlertDays: 7,
    unitAddress: "Rua do Procon, 100",
    unitAddressComplement: null,
    reminderEnabled: true,
    reminderHours: 24,
    ranges: [{ weekday: 1, slotIndex: 1, startTime: "08:00", endTime: "12:00" }],
    blockedDates: [],
    updatedBy: { id: 1, name: "Ana Paula Souza" },
    updatedAt: "2026-10-20T13:00:00.000Z"
}

const INPUT: ScheduleConfigInput = {
    slotMinutes: 30,
    seatsPerSlot: 3,
    windowDays: 30,
    minNoticeDays: 1,
    waitAlertDays: 7,
    unitAddress: "Rua do Procon, 100",
    unitAddressComplement: null,
    reminderEnabled: true,
    reminderHours: 24,
    ranges: [{ weekday: 1, startTime: "08:00", endTime: "12:00" }],
    blockedDates: []
}

const PREVIEW: MonthlyPreview = {
    month: "2026-11",
    today: "2026-10-24",
    windowStart: "2026-10-26",
    windowEnd: "2026-11-23",
    totalWindowSlots: 0,
    totalWindowSeats: 0,
    usedWindowSeats: 0,
    freeWindowSeats: 0,
    weekdays: [],
    days: [],
    conflicts: []
}

type Reply = { status: number; body: unknown }

function jsonResponse({ status, body }: Reply) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

async function setup(reply: (request: Request) => Reply) {
    vi.stubEnv("VITE_API_URL", "https://api.example.com")
    vi.resetModules()
    const fetchMock = vi.fn(async (input: Request) => jsonResponse(reply(input)))
    vi.stubGlobal("fetch", fetchMock)
    const { default: scheduleApi } = await import("@/store/api/schedule.api")
    const { default: createStore } = await import("@/store/createStore")
    const store = createStore()

    return { scheduleApi, store, fetchMock }
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

describe("scheduleApi", () => {
    it("lê GET /api/v1/schedule com as credenciais e devolve o data do envelope", async () => {
        const { scheduleApi, store, fetchMock } = await setup(() => ({
            status: 200,
            body: { data: VIEW }
        }))

        const result = await store.dispatch(scheduleApi.endpoints.getSchedule.initiate())

        expect(result.data).toEqual(VIEW)
        expect(requestAt(fetchMock, 0).method).toBe("GET")
        expect(requestAt(fetchMock, 0).url).toBe("https://api.example.com/api/v1/schedule")
        expect(requestAt(fetchMock, 0).credentials).toBe("include")
    })

    it("salva com PUT /api/v1/schedule e atualiza a configuração em cache", async () => {
        const saved = { ...VIEW, seatsPerSlot: 3 }
        const { scheduleApi, store, fetchMock } = await setup((request) =>
            request.method === "PUT"
                ? { status: 200, body: { data: saved } }
                : { status: 200, body: { data: VIEW } }
        )
        const subscription = store.dispatch(scheduleApi.endpoints.getSchedule.initiate())
        await subscription

        const result = await store.dispatch(
            scheduleApi.endpoints.saveSchedule.initiate({ config: INPUT })
        )

        expect(result.data).toEqual(saved)
        expect(requestAt(fetchMock, 1).method).toBe("PUT")
        expect(requestAt(fetchMock, 1).url).toBe("https://api.example.com/api/v1/schedule")
        expect(await bodyAt(fetchMock, 1)).toEqual(INPUT)
        expect(scheduleApi.endpoints.getSchedule.select()(store.getState()).data).toEqual(saved)
        expect(fetchMock).toHaveBeenCalledTimes(2)
        subscription.unsubscribe()
    })

    it("não mexe na configuração em cache quando o salvamento falha", async () => {
        const { scheduleApi, store } = await setup((request) =>
            request.method === "PUT"
                ? { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } }
                : { status: 200, body: { data: VIEW } }
        )
        const subscription = store.dispatch(scheduleApi.endpoints.getSchedule.initiate())
        await subscription

        const result = await store.dispatch(
            scheduleApi.endpoints.saveSchedule.initiate({ config: INPUT })
        )

        expect(result.error).toBeDefined()
        expect(scheduleApi.endpoints.getSchedule.select()(store.getState()).data).toEqual(VIEW)
        subscription.unsubscribe()
    })

    it("salva mudança futura em PUT /api/v1/schedule/versions/:effectiveFrom", async () => {
        const { scheduleApi, store, fetchMock } = await setup(() => ({
            status: 200,
            body: { data: { ...VIEW, effectiveFrom: "2026-11-10" } }
        }))

        const result = await store.dispatch(
            scheduleApi.endpoints.saveSchedule.initiate({
                config: INPUT,
                effectiveFrom: "2026-11-10"
            })
        )

        expect(result.data).toMatchObject({ effectiveFrom: "2026-11-10" })
        expect(requestAt(fetchMock, 0).method).toBe("PUT")
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/schedule/versions/2026-11-10"
        )
        expect(await bodyAt(fetchMock, 0)).toEqual(INPUT)
    })

    it("pede a prévia salva sem mês e com o mês informado", async () => {
        const { scheduleApi, store, fetchMock } = await setup(() => ({
            status: 200,
            body: { data: PREVIEW }
        }))

        const withoutMonth = await store.dispatch(
            scheduleApi.endpoints.getSchedulePreview.initiate(undefined)
        )
        await store.dispatch(scheduleApi.endpoints.getSchedulePreview.initiate("2026-12"))

        expect(withoutMonth.data).toEqual(PREVIEW)
        expect(requestAt(fetchMock, 0).url).toBe("https://api.example.com/api/v1/schedule/preview")
        expect(requestAt(fetchMock, 1).url).toBe(
            "https://api.example.com/api/v1/schedule/preview?month=2026-12"
        )
    })

    it("pede a prévia do rascunho com POST /api/v1/schedule/preview levando o mês e a configuração", async () => {
        const { scheduleApi, store, fetchMock } = await setup(() => ({
            status: 200,
            body: { data: PREVIEW }
        }))

        const result = await store.dispatch(
            scheduleApi.endpoints.previewScheduleDraft.initiate({
                month: "2026-11",
                config: INPUT,
                effectiveFrom: "2026-11-10"
            })
        )

        expect(result.data).toEqual(PREVIEW)
        expect(requestAt(fetchMock, 0).method).toBe("POST")
        expect(requestAt(fetchMock, 0).url).toBe("https://api.example.com/api/v1/schedule/preview")
        expect(await bodyAt(fetchMock, 0)).toEqual({
            month: "2026-11",
            config: INPUT,
            effectiveFrom: "2026-11-10"
        })
    })

    it("pede de novo a prévia salva depois de salvar", async () => {
        const { scheduleApi, store, fetchMock } = await setup((request) =>
            request.method === "PUT"
                ? { status: 200, body: { data: VIEW } }
                : { status: 200, body: { data: PREVIEW } }
        )
        const subscription = store.dispatch(
            scheduleApi.endpoints.getSchedulePreview.initiate(undefined)
        )
        await subscription

        await store.dispatch(scheduleApi.endpoints.saveSchedule.initiate({ config: INPUT }))

        await vi.waitFor(() =>
            expect(
                fetchMock.mock.calls.filter(([request]) =>
                    (request as Request).url.endsWith("/api/v1/schedule/preview")
                )
            ).toHaveLength(2)
        )
        subscription.unsubscribe()
    })

    it("lê GET /api/v1/schedule/booked-days e devolve a lista de dias", async () => {
        const days = [
            { date: "2026-11-04", weekday: 3, total: 1, times: [{ time: "09:00", count: 1 }] }
        ]
        const { scheduleApi, store, fetchMock } = await setup(() => ({
            status: 200,
            body: { data: { days } }
        }))

        const result = await store.dispatch(scheduleApi.endpoints.getBookedDays.initiate())

        expect(result.data).toEqual(days)
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/schedule/booked-days"
        )
    })
})
