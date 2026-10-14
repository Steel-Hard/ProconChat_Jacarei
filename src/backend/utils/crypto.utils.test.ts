import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { decrypt, encrypt } from "./crypto.utils"

describe("crypto.utils", () => {
  const originalKey = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-only-encryption-key-for-aes256"
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ENCRYPTION_KEY
    } else {
      process.env.ENCRYPTION_KEY = originalKey
    }
  })

  it("deve criptografar e decifrar com sucesso mantendo o valor original", () => {
    const original = "5512999998888"
    const encrypted = encrypt(original)

    expect(encrypted).not.toBe(original)
    expect(encrypted.startsWith("v1:")).toBe(true)

    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(original)
  })

  it("deve obedecer à regex da constraint do banco de dados", () => {
    const regex =
      /^v1:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$/

    const encrypted = encrypt("5512987654321")
    expect(regex.test(encrypted)).toBe(true)
  })

  it("deve lançar erro se tentar decifrar formato inválido", () => {
    expect(() => decrypt("invalido")).toThrow("Formato de texto cifrado inválido")
    expect(() => decrypt("v2:abc:def:ghi")).toThrow("Formato de texto cifrado inválido")
  })

  it("deve falhar se ENCRYPTION_KEY não estiver definida", () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encrypt("5512999998888")).toThrow("ENCRYPTION_KEY is not configured")
  })
})
