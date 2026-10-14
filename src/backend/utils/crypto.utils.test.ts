import { afterEach, describe, expect, it, vi } from "vitest"
import { decrypt, encrypt } from "./crypto.utils"

const CHECK_PATTERN = /^v1:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$/
const OTHER_KEY = "f".repeat(64)

function replacePart(value: string, index: number, replacement: (part: string) => string): string {
    const parts = value.split(":")
    parts[index] = replacement(parts[index] ?? "")
    return parts.join(":")
}

function flipFirstByte(part: string): string {
    const bytes = Buffer.from(part, "base64")
    bytes[0] = (bytes[0] ?? 0) ^ 0xff
    return bytes.toString("base64")
}

describe("crypto.utils", () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it("cifra no formato v1 aceito pelo CHECK da tabela e decifra o texto original", () => {
        const encrypted = encrypt("token-ficticio-de-acesso")

        expect(encrypted).toMatch(CHECK_PATTERN)
        expect(decrypt(encrypted)).toBe("token-ficticio-de-acesso")
    })

    it("gera resultados diferentes para o mesmo texto", () => {
        const first = encrypt("mesmo-texto")
        const second = encrypt("mesmo-texto")

        expect(first).not.toBe(second)
    })

    it.each([
        ["o IV", 1],
        ["a tag", 2],
        ["o texto cifrado", 3],
    ])("recusa o valor quando %s foi alterado, sem expor o valor", (_label, index) => {
        const encrypted = encrypt("segredo-ficticio")
        const tampered = replacePart(encrypted, index, flipFirstByte)

        expect(() => decrypt(tampered)).toThrow(new Error("Invalid encrypted value"))
    })

    it("recusa o valor cifrado com outra chave", () => {
        const encrypted = encrypt("segredo-ficticio")
        vi.stubEnv("ENCRYPTION_KEY", OTHER_KEY)

        expect(() => decrypt(encrypted)).toThrow(new Error("Invalid encrypted value"))
    })

    it.each(["v2:AAAA:AAAA:AAAA", "texto-em-claro", "v1:AAAA:AAAA", "v1:AAAAAAAAAAAAAAAA:AAAA:AAAA"])(
        "recusa o formato invalido %s",
        (value) => {
            expect(() => decrypt(value)).toThrow(new Error("Invalid encrypted value"))
        },
    )

    it("recusa cifrar texto vazio", () => {
        expect(() => encrypt("")).toThrow(new Error("Cannot encrypt an empty value"))
    })

    it.each([undefined, "", "abc", "g".repeat(64), "a".repeat(63), "a".repeat(65)])(
        "lanca ao cifrar e decifrar quando ENCRYPTION_KEY e %s",
        (value) => {
            const encrypted = encrypt("segredo-ficticio")
            vi.stubEnv("ENCRYPTION_KEY", value)

            expect(() => encrypt("segredo-ficticio")).toThrow(new Error("ENCRYPTION_KEY must be 64 hexadecimal characters"))
            expect(() => decrypt(encrypted)).toThrow(new Error("ENCRYPTION_KEY must be 64 hexadecimal characters"))
        },
    )
})
