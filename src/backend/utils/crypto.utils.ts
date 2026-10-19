import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const VERSION_PREFIX = "v1"
const KEY_PATTERN = /^[0-9a-fA-F]{64}$/
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/

export const ENCRYPTION_KEY_ERROR = "ENCRYPTION_KEY must be 64 hexadecimal characters"
const INVALID_VALUE_ERROR = "Invalid encrypted value"

export function isValidEncryptionKey(value: string | undefined): boolean {
    return value !== undefined && KEY_PATTERN.test(value)
}

function getKey(): Buffer {
    const value = process.env.ENCRYPTION_KEY
    if (!isValidEncryptionKey(value)) {
        throw new Error(ENCRYPTION_KEY_ERROR)
    }
    return Buffer.from(value as string, "hex")
}

export function encrypt(plaintext: string): string {
    const key = getKey()
    if (plaintext === "") {
        throw new Error("Cannot encrypt an empty value")
    }
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()
    return [VERSION_PREFIX, iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":")
}

function decodePart(part: string | undefined): Buffer {
    if (part === undefined || !BASE64_PATTERN.test(part)) {
        throw new Error(INVALID_VALUE_ERROR)
    }
    return Buffer.from(part, "base64")
}

export function decrypt(text: string): string {
    const key = getKey()
    const parts = text.split(":")
    if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
        throw new Error(INVALID_VALUE_ERROR)
    }
    const iv = decodePart(parts[1])
    const authTag = decodePart(parts[2])
    const ciphertext = decodePart(parts[3])
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error(INVALID_VALUE_ERROR)
    }
    try {
        const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
        decipher.setAuthTag(authTag)
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
    } catch {
        throw new Error(INVALID_VALUE_ERROR)
    }
}
