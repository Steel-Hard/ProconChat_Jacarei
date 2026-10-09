import { createHash } from "node:crypto"

const MESSAGE_REF_LENGTH = 16

export function messageRef(messageId: string): string {
    return createHash("sha256").update(messageId).digest("hex").slice(0, MESSAGE_REF_LENGTH)
}
