import { describe, expect, it } from "vitest"
import safeRedirectPath from "@/utils/safeRedirectPath"

describe("safeRedirectPath", () => {
    it("aceita um caminho interno simples", () => {
        expect(safeRedirectPath("/sessoes")).toBe("/sessoes")
    })

    it("mantém a query e o hash do caminho interno", () => {
        expect(safeRedirectPath("/agendamentos/123?aba=historico#topo")).toBe(
            "/agendamentos/123?aba=historico#topo"
        )
    })

    it("recusa um caminho que começa com duas barras", () => {
        expect(safeRedirectPath("//evil.com")).toBeNull()
    })

    it("recusa um endereço absoluto de outro site", () => {
        expect(safeRedirectPath("https://evil.com")).toBeNull()
    })

    it("recusa um caminho que começa com barra e contrabarra", () => {
        expect(safeRedirectPath("/\\evil.com")).toBeNull()
    })

    it("recusa javascript: e caracteres de controle", () => {
        expect(safeRedirectPath("javascript:alert(1)")).toBeNull()
        expect(safeRedirectPath("/\t/evil.com")).toBeNull()
    })

    it("recusa o próprio login, com ou sem query", () => {
        expect(safeRedirectPath("/login")).toBeNull()
        expect(safeRedirectPath("/login?redirect=/x")).toBeNull()
    })

    it("recusa nulo, vazio, só espaços e caminho codificado duas vezes", () => {
        expect(safeRedirectPath(null)).toBeNull()
        expect(safeRedirectPath("")).toBeNull()
        expect(safeRedirectPath("   ")).toBeNull()
        expect(safeRedirectPath("%2Fsessoes")).toBeNull()
    })
})
