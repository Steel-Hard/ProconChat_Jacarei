import { timingSafeEqual } from "node:crypto"

export function isValidInternalToken(header: string | undefined): boolean {
    const expected = process.env.GATEWAY_INTERNAL_TOKEN
    if (!header || !expected) {
        return false
    }
    const receivedBuffer = Buffer.from(header)
    const expectedBuffer = Buffer.from(expected)
    if (receivedBuffer.length !== expectedBuffer.length) {
        return false
    }
    return timingSafeEqual(receivedBuffer, expectedBuffer)
}
