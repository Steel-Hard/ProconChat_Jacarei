import { describe, expect, test } from "vitest"
import { validateOutgoingMessage } from "./outgoingMessage.validation"
import { ListRow, OutgoingMessage, ReplyButton } from "../types/message.types"

function rows(count: number): ListRow[] {
    return Array.from({ length: count }, (_, index) => ({ id: `row-${index}`, title: `Opcao ${index}` }))
}

function buttons(count: number): ReplyButton[] {
    return Array.from({ length: count }, (_, index) => ({ id: `btn-${index}`, title: `Botao ${index}` }))
}

function list(overrides: Partial<Extract<OutgoingMessage, { type: "list" }>> = {}): OutgoingMessage {
    return { type: "list", text: "Escolha uma categoria", buttonText: "Ver opcoes", rows: rows(3), ...overrides }
}

function buttonsMessage(
    overrides: Partial<Extract<OutgoingMessage, { type: "buttons" }>> = {},
): OutgoingMessage {
    return { type: "buttons", text: "Resolveu?", buttons: buttons(2), ...overrides }
}

describe("validateOutgoingMessage", () => {
    test("aceita texto com ate 4096 caracteres", () => {
        const result = validateOutgoingMessage({ type: "text", text: "a".repeat(4096) })

        expect(result).toEqual({ ok: true })
    })

    test("recusa texto vazio ou acima de 4096 caracteres sem dividir", () => {
        const empty = validateOutgoingMessage({ type: "text", text: "   " })
        const tooLong = validateOutgoingMessage({ type: "text", text: "a".repeat(4097) })

        expect(empty.ok).toBe(false)
        expect(tooLong.ok).toBe(false)
    })

    test("aceita lista nos limites exatos", () => {
        const maxRows = rows(10).map((row, index) => ({
            id: row.id,
            title: `${index}`.padEnd(24, "t"),
            description: "d".repeat(72),
        }))

        const result = validateOutgoingMessage(
            list({ text: "a".repeat(4096), buttonText: "b".repeat(20), rows: maxRows }),
        )

        expect(result).toEqual({ ok: true })
    })

    test("recusa lista sem linhas ou com mais de 10 linhas", () => {
        expect(validateOutgoingMessage(list({ rows: [] })).ok).toBe(false)
        expect(validateOutgoingMessage(list({ rows: rows(11) })).ok).toBe(false)
    })

    test("recusa titulo de linha vazio ou com mais de 24 caracteres", () => {
        expect(validateOutgoingMessage(list({ rows: [{ id: "a", title: " " }] })).ok).toBe(false)
        expect(validateOutgoingMessage(list({ rows: [{ id: "a", title: "t".repeat(25) }] })).ok).toBe(false)
    })

    test("recusa descricao de linha com mais de 72 caracteres", () => {
        const result = validateOutgoingMessage(
            list({ rows: [{ id: "a", title: "Opcao", description: "d".repeat(73) }] }),
        )

        expect(result.ok).toBe(false)
    })

    test("recusa buttonText vazio ou com mais de 20 caracteres", () => {
        expect(validateOutgoingMessage(list({ buttonText: "" })).ok).toBe(false)
        expect(validateOutgoingMessage(list({ buttonText: "b".repeat(21) })).ok).toBe(false)
    })

    test("recusa corpo da lista vazio ou acima de 4096 caracteres", () => {
        expect(validateOutgoingMessage(list({ text: "" })).ok).toBe(false)
        expect(validateOutgoingMessage(list({ text: "a".repeat(4097) })).ok).toBe(false)
    })

    test("aceita 3 botoes de 20 caracteres com corpo de 1024", () => {
        const maxButtons = buttons(3).map((button, index) => ({
            id: button.id,
            title: `${index}`.padEnd(20, "t"),
        }))

        const result = validateOutgoingMessage(buttonsMessage({ text: "a".repeat(1024), buttons: maxButtons }))

        expect(result).toEqual({ ok: true })
    })

    test("recusa nenhum botao, mais de 3 botoes ou titulo de botao com mais de 20 caracteres", () => {
        expect(validateOutgoingMessage(buttonsMessage({ buttons: [] })).ok).toBe(false)
        expect(validateOutgoingMessage(buttonsMessage({ buttons: buttons(4) })).ok).toBe(false)
        expect(
            validateOutgoingMessage(buttonsMessage({ buttons: [{ id: "a", title: "t".repeat(21) }] })).ok,
        ).toBe(false)
    })

    test("recusa corpo dos botoes acima de 1024 caracteres", () => {
        const result = validateOutgoingMessage(buttonsMessage({ text: "a".repeat(1025) }))

        expect(result.ok).toBe(false)
    })

    test("recusa ids vazios, repetidos ou acima do limite da Meta", () => {
        expect(validateOutgoingMessage(list({ rows: [{ id: "", title: "Opcao" }] })).ok).toBe(false)
        expect(
            validateOutgoingMessage(
                list({
                    rows: [
                        { id: "a", title: "Um" },
                        { id: "a", title: "Dois" },
                    ],
                }),
            ).ok,
        ).toBe(false)
        expect(validateOutgoingMessage(list({ rows: [{ id: "i".repeat(201), title: "Opcao" }] })).ok).toBe(false)
        expect(
            validateOutgoingMessage(
                buttonsMessage({
                    buttons: [
                        { id: "b", title: "Sim" },
                        { id: "b", title: "Nao" },
                    ],
                }),
            ).ok,
        ).toBe(false)
        expect(
            validateOutgoingMessage(buttonsMessage({ buttons: [{ id: "i".repeat(257), title: "Sim" }] })).ok,
        ).toBe(false)
    })
})
