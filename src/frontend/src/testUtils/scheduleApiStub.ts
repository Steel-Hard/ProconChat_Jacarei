import { vi } from "vitest"
import buildMonthlyPreview from "@/testUtils/buildMonthlyPreview"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import type BookedDay from "@/types/schedule/BookedDay.types"

type Reply = { status: number; body?: unknown }
type ScheduleHandler = (request: { url: URL; body: unknown }) => Reply | Promise<Reply>
type ScheduleCall = { method: string; url: URL; body: unknown }

type StubOptions = {
    handlers?: Record<string, ScheduleHandler>
    bookedDays?: BookedDay[]
}

function respond({ status, body }: Reply): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

function startCall(input: RequestInfo | URL, init?: RequestInit): ScheduleCall {
    if (input instanceof Request) {
        return { method: input.method, url: new URL(input.url), body: undefined }
    }

    return { method: init?.method ?? "GET", url: new URL(String(input)), body: undefined }
}

async function bodyOf(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
    if (input instanceof Request) {
        const text = await input.clone().text()

        return text === "" ? undefined : JSON.parse(text)
    }

    const raw = init?.body

    return typeof raw === "string" ? JSON.parse(raw) : undefined
}

function scheduleApiStub({ handlers = {}, bookedDays = [] }: StubOptions = {}) {
    const calls: ScheduleCall[] = []
    const replies: Record<string, ScheduleHandler> = {
        "GET /api/v1/schedule": () => ({ status: 200, body: { data: buildScheduleConfig() } }),
        "GET /api/v1/schedule/preview": ({ url }) => ({
            status: 200,
            body: { data: buildMonthlyPreview(url.searchParams.get("month") ?? "2026-11") }
        }),
        "POST /api/v1/schedule/preview": ({ body }) => ({
            status: 200,
            body: {
                data: buildMonthlyPreview((body as { month?: string }).month ?? "2026-11")
            }
        }),
        "GET /api/v1/schedule/booked-days": () => ({
            status: 200,
            body: { data: { days: bookedDays } }
        }),
        "POST /api/v1/auth/refresh": () => ({ status: 401 }),
        ...handlers
    }
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const call = startCall(input, init)
            calls.push(call)
            call.body = await bodyOf(input, init)
            const handler = replies[`${call.method} ${call.url.pathname}`]

            if (!handler) {
                return respond({
                    status: 404,
                    body: { error: { code: "NOT_FOUND", message: "x" } }
                })
            }

            return respond(await handler({ url: call.url, body: call.body }))
        })
    )

    function callsTo(method: string, pathname: string): ScheduleCall[] {
        return calls.filter((call) => call.method === method && call.url.pathname === pathname)
    }

    return { calls, callsTo }
}

export default scheduleApiStub
