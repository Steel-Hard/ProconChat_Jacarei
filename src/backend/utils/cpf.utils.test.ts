import { describe, expect, it } from "vitest"
import { cleanCpf, hashCpf, maskCpf, validateCpf } from "./cpf.utils"

describe("cpf.utils", () => {
  describe("validateCpf", () => {
    it("deve aceitar CPFs válidos com e sem pontuação", () => {
      // CPFs válidos conhecidos para teste
      expect(validateCpf("52998224725")).toBe(true)
      expect(validateCpf("529.982.247-25")).toBe(true)
      expect(validateCpf("00000000191")).toBe(true)
    })

    it("deve rejeitar CPFs com dígitos verificadores incorretos", () => {
      expect(validateCpf("52998224720")).toBe(false)
      expect(validateCpf("12345678900")).toBe(false)
    })

    it("deve rejeitar sequências de dígitos iguais", () => {
      expect(validateCpf("00000000000")).toBe(false)
      expect(validateCpf("11111111111")).toBe(false)
      expect(validateCpf("99999999999")).toBe(false)
    })

    it("deve rejeitar entradas vazias, nulas ou com tamanho incorreto", () => {
      expect(validateCpf("")).toBe(false)
      expect(validateCpf(null)).toBe(false)
      expect(validateCpf(undefined)).toBe(false)
      expect(validateCpf("123")).toBe(false)
      expect(validateCpf("1234567890123")).toBe(false)
    })
  })

  describe("maskCpf", () => {
    it("deve mascarar corretamente no formato ***.XXX.XXX-**", () => {
      const masked = maskCpf("52998224725")
      expect(masked).toBe("***.982.247-**")
      expect(/^\*{3}\.[0-9]{3}\.[0-9]{3}-\*{2}$/.test(masked)).toBe(true)
    })

    it("deve mascarar mesmo se receber com pontuação", () => {
      const masked = maskCpf("529.982.247-25")
      expect(masked).toBe("***.982.247-**")
    })

    it("deve lançar erro se tamanho for diferente de 11 dígitos", () => {
      expect(() => maskCpf("123")).toThrow()
    })
  })

  describe("hashCpf", () => {
    it("deve gerar hash SHA-256 de 64 caracteres hexadecimais minúsculos", () => {
      const hash = hashCpf("52998224725")
      expect(hash).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true)
      // Mesma entrada com ou sem formatação deve produzir o mesmo hash
      expect(hashCpf("529.982.247-25")).toBe(hash)
    })
  })

  describe("cleanCpf", () => {
    it("deve remover pontos, traços e espaços", () => {
      expect(cleanCpf(" 123.456.789-01 ")).toBe("12345678901")
    })
  })
})
