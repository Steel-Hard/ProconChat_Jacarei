import { vi } from "vitest"

export interface GraphCall {
    url: string
    authorization: string | null
    body: Record<string, unknown>
}

export interface SentMessage {
    to: string
    type: "text" | "list" | "buttons" | "template" | "other"
    text: string
    optionIds: string[]
}

type FetchFn = typeof fetch

const GRAPH_HOST = "graph.facebook.com"
const LOCAL_HOST = "127.0.0.1"

interface InteractiveBody {
    type: string
    body: { text: string }
    action: {
        sections?: { rows: { id: string }[] }[]
        buttons?: { reply: { id: string } }[]
    }
}

function urlOf(input: Parameters<FetchFn>[0]): URL {
    if (typeof input === "string") {
        return new URL(input)
    }
    return new URL(input instanceof URL ? input.href : input.url)
}

function bodyOf(init: RequestInit | undefined): Record<string, unknown> {
    return typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {}
}

function interactiveMessage(to: string, interactive: InteractiveBody): SentMessage {
    if (interactive.type === "list") {
        const optionIds = (interactive.action.sections ?? []).flatMap((section) => section.rows.map((row) => row.id))
        return { to, type: "list", text: interactive.body.text, optionIds }
    }
    const optionIds = (interactive.action.buttons ?? []).map((button) => button.reply.id)
    return { to, type: "buttons", text: interactive.body.text, optionIds }
}

export function toSentMessage(call: GraphCall): SentMessage | null {
    const body = call.body
    if (typeof body.to !== "string") {
        return null
    }
    if (body.type === "text") {
        return { to: body.to, type: "text", text: (body.text as { body: string }).body, optionIds: [] }
    }
    if (body.type === "interactive") {
        return interactiveMessage(body.to, body.interactive as InteractiveBody)
    }
    if (body.type === "template") {
        return { to: body.to, type: "template", text: "", optionIds: [] }
    }
    return { to: body.to, type: "other", text: "", optionIds: [] }
}

export interface MetaFake {
    graphCalls: GraphCall[]
    unexpectedCalls: string[]
    sentSince(index: number): SentMessage[]
    sentTo(phone: string): SentMessage[]
    restore(): void
}

function collectMessages(calls: GraphCall[]): SentMessage[] {
    return calls.map(toSentMessage).filter((message): message is SentMessage => message !== null)
}

export function installMetaFake(): MetaFake {
    const realFetch: FetchFn = globalThis.fetch
    const graphCalls: GraphCall[] = []
    const unexpectedCalls: string[] = []
    let messageSequence = 0

    const fake = vi.fn(async (input: Parameters<FetchFn>[0], init?: RequestInit): Promise<Response> => {
        const url = urlOf(input)
        if (url.hostname === GRAPH_HOST) {
            graphCalls.push({
                url: url.href,
                authorization: new Headers(init?.headers).get("authorization"),
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
        sentSince: (index) => collectMessages(graphCalls.slice(index)),
        sentTo: (phone) => collectMessages(graphCalls).filter((message) => message.to === phone),
        restore: () => {
            vi.unstubAllGlobals()
        },
    }
}
