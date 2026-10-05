import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const VERSION_PREFIX = "v1"

function getKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.PHONE_HASH_SECRET ||
    "proconchat-fallback-encryption-key-for-local-dev"
  return createHash("sha256").update(secret, "utf8").digest()
}

/**
 * Criptografa uma string usando AES-256-GCM.
 * Formato gerado: `v1:<ivBase64>:<authTagBase64>:<ciphertextBase64>`
 * Atende às constraints do PostgreSQL `chk_appointments_phone_encrypted` e `chk_whatsapp_settings_*_encrypted`.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  const ivB64 = iv.toString("base64")
  const tagB64 = authTag.toString("base64")
  const dataB64 = ciphertext.toString("base64")

  return `${VERSION_PREFIX}:${ivB64}:${tagB64}:${dataB64}`
}

/**
 * Decifra uma string no formato `v1:<ivBase64>:<authTagBase64>:<ciphertextBase64>`.
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":")

  if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
    throw new Error("Formato de texto cifrado inválido")
  }

  const iv = Buffer.from(parts[1] ?? "", "base64")
  const authTag = Buffer.from(parts[2] ?? "", "base64")
  const ciphertext = Buffer.from(parts[3] ?? "", "base64")

  const key = getKey()
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}
