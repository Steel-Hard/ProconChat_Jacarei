import { vi } from "vitest"
import buildMonthlyPreview from "@/testUtils/buildMonthlyPreview"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"

function noRelease() {}

function jsonReply(data: unknown): Response {
    return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    })
}

function stubScheduleFetch(): () => void {
    let release: () => void = noRelease
    const configReady = new Promise<void>((resolve) => {
        release = () => resolve()
    })
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const url = input instanceof Request ? input.url : String(input)

            if (url.endsWith("/api/v1/schedule")) {
                await configReady
                return jsonReply(buildScheduleConfig())
            }

            if (url.includes("/api/v1/schedule/preview")) {
                return jsonReply(buildMonthlyPreview())
            }

            if (url.endsWith("/api/v1/schedule/booked-days")) {
                return jsonReply({ days: [] })
            }

            return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "x" } }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            })
        })
    )

    return release
}

export default stubScheduleFetch
