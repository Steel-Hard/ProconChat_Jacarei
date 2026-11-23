import { createHmac } from "node:crypto"

export function hashProviderMessageId(providerMessageId: string): string {
    const secret = process.env.PHONE_HASH_SECRET
    if (!secret) {
        throw new Error("PHONE_HASH_SECRET is not configured")
    }

    return createHmac("sha256", secret).update(`wamid:${providerMessageId}`).digest("hex")
}
