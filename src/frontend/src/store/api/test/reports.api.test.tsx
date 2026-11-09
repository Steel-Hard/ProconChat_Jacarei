import { afterEach, describe, expect, it, vi } from "vitest"

const SUMMARY = {
    period: {
        preset: "30d",
        startDate: "2026-10-08",
        endDate: "2026-11-06",
        daysCount: 30,
        today: "2026-11-07"
    },
    conversations: { total: 40, dailyAverage: 1.3, appointmentsCreated: 8 },
    outcomes: [],
    topCategories: [],
    topQuestions: [],
    appointmentsResult: {
        attended: 5,
        noShow: 2,
        canceled: 1,
        waitingRecord: 0,
        upcoming: 2,
        total: 10,
        recordedTotal: 7,
        noShowRate: 28.6
    }
}

async function setup() {
    vi.stubEnv("VITE_API_URL", "https://api.example.com")
    vi.resetModules()
    const fetchMock = vi.fn(
        async (_input: Request) =>
            new Response(JSON.stringify({ data: SUMMARY }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
    )
    vi.stubGlobal("fetch", fetchMock)
    const { default: reportsApi } = await import("@/store/api/reports.api")
    const { default: createStore } = await import("@/store/createStore")

    return { reportsApi, store: createStore(), fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("reportsApi", () => {
    it("consulta os relatórios pelo período predefinido", async () => {
        const { reportsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            reportsApi.endpoints.getReports.initiate({ period: "7d" })
        )

        expect(result.data).toEqual(SUMMARY)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toBe("https://api.example.com/api/v1/reports?period=7d")
        expect(request.credentials).toBe("include")
    })

    it("envia datas personalizadas na query da API", async () => {
        const { reportsApi, store, fetchMock } = await setup()

        await store.dispatch(
            reportsApi.endpoints.getReports.initiate({
                period: "custom",
                startDate: "2026-10-01",
                endDate: "2026-10-31"
            })
        )

        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toBe(
            "https://api.example.com/api/v1/reports?period=custom&startDate=2026-10-01&endDate=2026-10-31"
        )
    })
})
