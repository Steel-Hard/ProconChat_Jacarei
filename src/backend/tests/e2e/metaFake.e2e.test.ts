import { afterEach, describe, expect, test } from "vitest"
import { GraphCall, installMetaFake, MetaFake, toSentMessage } from "./helpers/metaFake"

function callWith(body: Record<string, unknown>): GraphCall {
    return { url: "https://graph.facebook.com/v26.0/1/messages", authorization: "Bearer t", body }
}

describe("toSentMessage", () => {
    test("le o texto de uma mensagem de texto", () => {
        const sent = toSentMessage(callWith({ to: "551", type: "text", text: { body: "Ola" } }))

        expect(sent).toEqual({ to: "551", type: "text", text: "Ola", optionIds: [] })
    })

    test("le os ids dos botoes de uma mensagem interativa de botoes", () => {
        const sent = toSentMessage(
            callWith({
                to: "551",
                type: "interactive",
                interactive: {
                    type: "button",
                    body: { text: "Resolveu?" },
                    action: { buttons: [{ reply: { id: "resolved_yes" } }, { reply: { id: "resolved_no" } }] },
                },
            }),
        )

        expect(sent).toEqual({ to: "551", type: "buttons", text: "Resolveu?", optionIds: ["resolved_yes", "resolved_no"] })
    })

    test("le os ids de todas as linhas de uma lista", () => {
        const sent = toSentMessage(
            callWith({
                to: "551",
                type: "interactive",
                interactive: {
                    type: "list",
                    body: { text: "Escolha" },
                    action: { sections: [{ rows: [{ id: "cat_1" }] }, { rows: [{ id: "cat_2" }, { id: "page_2" }] }] },
                },
            }),
        )

        expect(sent).toEqual({ to: "551", type: "list", text: "Escolha", optionIds: ["cat_1", "cat_2", "page_2"] })
    })

    test("identifica uma mensagem de modelo", () => {
        const sent = toSentMessage(callWith({ to: "551", type: "template", template: { name: "aviso" } }))

        expect(sent).toMatchObject({ to: "551", type: "template" })
    })

    test("devolve null para o indicador de digitacao, que nao tem destinatario", () => {
        expect(toSentMessage(callWith({ status: "read", message_id: "wamid.1" }))).toBeNull()
    })
})

describe("installMetaFake", () => {
    let meta: MetaFake

    afterEach(() => {
        meta.restore()
    })

    test("guarda a chamada a Graph API e responde 200 com um id", async () => {
        meta = installMetaFake()

        const response = await fetch("https://graph.facebook.com/v26.0/1/messages", {
            method: "POST",
            headers: { Authorization: "Bearer token-e2e", "Content-Type": "application/json" },
            body: JSON.stringify({ to: "551", type: "text", text: { body: "Ola" } }),
        })

        expect(response.status).toBe(200)
        expect(meta.graphCalls).toHaveLength(1)
        expect(meta.graphCalls[0]?.authorization).toBe("Bearer token-e2e")
        expect(meta.sentTo("551")).toHaveLength(1)
        expect(meta.sentSince(1)).toEqual([])
    })

    test("registra e recusa qualquer outro endereco externo", async () => {
        meta = installMetaFake()

        await expect(fetch("https://exemplo.invalid/qualquer")).rejects.toThrow()

        expect(meta.unexpectedCalls).toEqual(["https://exemplo.invalid/qualquer"])
    })
})
