import { vi } from "vitest"

export interface GraphCall {
    url: string
    authorization: string | null
    body: Record<string, unknown>
}

export interface SentMessage {
    to: string
    type: "text" | "list" | "buttons" | "other"
    text: string
    optionIds: string[]
}

type FetchFn = typeof fetch

const GRAPH_HOST = "graph.facebook.com"
const LOCAL_HOST = "127.0.0.1"

function urlOf(input: Parameters<FetchFn>[0]): URL {
    if (typeof input === "string") {
        return new URL(input)
    }
    return new URL(input instanceof URL ? input.href : input.url)
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
    return new Headers(init?.headers).get(name)
}

function bodyOf(init: RequestInit | undefined): Record<string, unknown> {
    return typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {}
}

export function toSentMessage(call: GraphCall): SentMessage | null {
    const body = call.body
    if (typeof body.to !== "string") {
        return null
    }
    if (body.type === "text") {
        const text = (body.text as { body: string }).body
        return { to: body.to, type: "text", text, optionIds: [] }
    }
    if (body.type === "interactive") {
        const interactive = body.interactive as {
            type: string
            body: { text: string }
            action: {
                sections?: { rows: { id: string }[] }[]
                buttons?: { reply: { id: string } }[]
            }
        }
        if (interactive.type === "list") {
            const optionIds = (interactive.action.sections ?? []).flatMap((section) => section.rows.map((row) => row.id))
            return { to: body.to, type: "list", text: interactive.body.text, optionIds }
        }
        const optionIds = (interactive.action.buttons ?? []).map((button) => button.reply.id)
        return { to: body.to, type: "buttons", text: interactive.body.text, optionIds }
    }
    return { to: body.to, type: "other", text: "", optionIds: [] }
}

export function installMetaFake() {
    const realFetch: FetchFn = globalThis.fetch
    const graphCalls: GraphCall[] = []
    const unexpectedCalls: string[] = []
    let messageSequence = 0

    const fake = vi.fn(async (input: Parameters<FetchFn>[0], init?: RequestInit): Promise<Response> => {
        const url = urlOf(input)
        if (url.hostname === GRAPH_HOST) {
            graphCalls.push({
                url: url.href,
                authorization: headerOf(init, "authorization"),
                body: bodyOf(init),
            })
            messageSequence += 1
            return new Response(JSON.stringify({ messages: [{ id: `wamid.e2e.${messageSequence}` }] }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            })
        }
        if (url.hostname === LOCAL_HOST) {
            return realFetch(input, init)
        }
        unexpectedCalls.push(url.href)
        throw new Error(`Chamada externa inesperada no E2E: ${url.href}`)
    })

    vi.stubGlobal("fetch", fake)

    return {
        graphCalls,
        unexpectedCalls,
        sentSince(index: number): SentMessage[] {
            return graphCalls
                .slice(index)
                .map(toSentMessage)
                .filter((message): message is SentMessage => message !== null)
        },
        restore(): void {
            vi.unstubAllGlobals()
        },
    }
}

export type MetaFake = ReturnType<typeof installMetaFake>
