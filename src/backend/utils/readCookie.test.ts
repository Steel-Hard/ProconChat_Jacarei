import { Request } from "express"
import { describe, expect, it } from "vitest"
import readCookie from "./readCookie"

const withCookie = (cookie?: string) => ({ headers: { cookie } }) as Request

describe("readCookie", () => {
    it("le o valor do cookie pedido entre outros cookies", () => {
        const req = withCookie("tema=escuro; proconchat_access=abc.def%2Bghi; outro=1")

        expect(readCookie(req, "proconchat_access")).toBe("abc.def+ghi")
    })

    it("devolve undefined quando o cookie nao existe", () => {
        expect(readCookie(withCookie("tema=escuro"), "proconchat_access")).toBeUndefined()
        expect(readCookie(withCookie(), "proconchat_access")).toBeUndefined()
    })

    it("trata o cabecalho malformado como ausente", () => {
        expect(readCookie(withCookie(";;; =; proconchat_access; ==="), "proconchat_access")).toBeUndefined()
        expect(readCookie(withCookie("proconchat_access="), "proconchat_access")).toBeUndefined()
    })

    it("trata o % invalido como ausente, sem lancar erro", () => {
        expect(readCookie(withCookie("proconchat_access=%E0%A4%A"), "proconchat_access")).toBeUndefined()
    })

    it("nao confunde o nome com o prefixo de outro cookie", () => {
        expect(readCookie(withCookie("xproconchat_access=1"), "proconchat_access")).toBeUndefined()
    })
})
