import { createHash } from "node:crypto"
import { describe, expect, test } from "vitest"
import { messageRef } from "./messageRef"

const WAMID = "wamid.HBgNNTUwMDAwMDAwMDk5ORUCABEYEkJGMzg3NTJGNUI2MkJFRDY4NAA="

describe("messageRef", () => {
    test("devolve sempre a mesma referencia para o mesmo wamid", () => {
        const first = messageRef(WAMID)
        const second = messageRef(WAMID)

        expect(first).toBe(second)
        expect(first).toBe(createHash("sha256").update(WAMID).digest("hex").slice(0, 16))
    })

    test("devolve 16 caracteres hex sem nenhum trecho do wamid", () => {
        const ref = messageRef(WAMID)

        expect(ref).toMatch(/^[0-9a-f]{16}$/)
        expect(WAMID).not.toContain(ref)
        expect(ref).not.toContain("NTUwMDAwMDAwMDk5")
    })

    test("devolve referencias diferentes para wamids diferentes", () => {
        expect(messageRef("wamid.a")).not.toBe(messageRef("wamid.b"))
    })
})
