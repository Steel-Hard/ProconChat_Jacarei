import { describe, expect, it } from "vitest"
import HttpError from "@/services/http/HttpError"
import parseResponse from "@/services/http/parseResponse"

describe("parseResponse", () => {
    it("devolve o corpo em JSON quando a resposta é ok", async () => {
        const response = new Response(JSON.stringify({ id: "1" }), { status: 200 })

        await expect(parseResponse<{ id: string }>(response)).resolves.toEqual({ id: "1" })
    })

    it("devolve undefined numa resposta 204", async () => {
        await expect(parseResponse(new Response(null, { status: 204 }))).resolves.toBeUndefined()
    })

    it("usa o código e a mensagem do envelope de erro do backend", async () => {
        const response = new Response(
            JSON.stringify({ error: { code: "NOT_FOUND", message: "não encontrado" } }),
            { status: 404 }
        )

        const error = await parseResponse(response).catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(HttpError)
        expect(error).toMatchObject({
            name: "HttpError",
            status: 404,
            code: "NOT_FOUND",
            message: "não encontrado"
        })
    })

    it("usa mensagem genérica quando o corpo do erro não é JSON", async () => {
        const response = new Response("falha", { status: 500 })

        await expect(parseResponse(response)).rejects.toThrow("Requisição falhou com status 500.")
    })
})
