import { createHmac } from "node:crypto"

export function cleanCpf(cpf: string): string {
    return cpf.replace(/\D/g, "")
}

export function validateCpf(cpf: string | undefined | null): boolean {
    if (!cpf) {
        return false
    }

    const cleaned = cleanCpf(cpf)

    if (cleaned.length !== 11) {
        return false
    }

    if (/^(\d)\1{10}$/.test(cleaned)) {
        return false
    }

    const digits = cleaned.split("").map(Number)

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

export function maskCpf(cpf: string): string {
    const cleaned = cleanCpf(cpf)
    if (cleaned.length !== 11) {
        throw new Error("CPF deve conter exatamente 11 dígitos para mascaramento")
    }

    const part1 = cleaned.slice(3, 6)
    const part2 = cleaned.slice(6, 9)

    return `***.${part1}.${part2}-**`
}

export function hashCpf(cpf: string, secret?: string): string {
    const secretKey = secret ?? process.env.CPF_HASH_SECRET
    if (!secretKey) {
        throw new Error("CPF_HASH_SECRET is not configured")
    }
    const cleaned = cleanCpf(cpf)
    return createHmac("sha256", secretKey).update(cleaned, "utf8").digest("hex").toLowerCase()
}
