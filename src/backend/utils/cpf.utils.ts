import { createHash } from "node:crypto"

/**
 * Remove qualquer caractere não numérico do CPF.
 */
export function cleanCpf(cpf: string): string {
  return cpf.replace(/\D/g, "")
}

/**
 * Valida se um CPF é válido pelo algoritmo oficial de dígitos verificadores (módulo 11).
 */
export function validateCpf(cpf: string | undefined | null): boolean {
  if (!cpf) {
    return false
  }

  const cleaned = cleanCpf(cpf)

  if (cleaned.length !== 11) {
    return false
  }

  // CPFs com todos os dígitos iguais são inválidos (ex: 00000000000, 11111111111)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false
  }

  const digits = cleaned.split("").map(Number)

  // Validação do 1º dígito verificador
  let sum1 = 0
  for (let i = 0; i < 9; i++) {
    sum1 += (digits[i] ?? 0) * (10 - i)
  }
  let rem1 = (sum1 * 10) % 11
  if (rem1 === 10 || rem1 === 11) {
    rem1 = 0
  }
  if (rem1 !== digits[9]) {
    return false
  }

  // Validação do 2º dígito verificador
  let sum2 = 0
  for (let i = 0; i < 10; i++) {
    sum2 += (digits[i] ?? 0) * (11 - i)
  }
  let rem2 = (sum2 * 10) % 11
  if (rem2 === 10 || rem2 === 11) {
    rem2 = 0
  }
  if (rem2 !== digits[10]) {
    return false
  }

  return true
}

/**
 * Mascara o CPF no formato exigido pelo banco: `***.XXX.XXX-**`
 * Regex: ^\*{3}\.[0-9]{3}\.[0-9]{3}-\*{2}$
 */
export function maskCpf(cpf: string): string {
  const cleaned = cleanCpf(cpf)
  if (cleaned.length !== 11) {
    throw new Error("CPF deve conter exatamente 11 dígitos para mascaramento")
  }

  const part1 = cleaned.slice(3, 6)
  const part2 = cleaned.slice(6, 9)

  return `***.${part1}.${part2}-**`
}

/**
 * Gera hash SHA-256 dos 11 dígitos limpos do CPF em hexadecimal (64 caracteres).
 * Regex: ^[0-9a-f]{64}$
 */
export function hashCpf(cpf: string): string {
  const cleaned = cleanCpf(cpf)
  return createHash("sha256").update(cleaned, "utf8").digest("hex").toLowerCase()
}
