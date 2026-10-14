const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_BYTES = 72

export default function validatePassword(password: string): string | null {
    if (password.length < MIN_PASSWORD_LENGTH) {
        return `Password must contain at least ${MIN_PASSWORD_LENGTH} characters`
    }
    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
        return `Password must not exceed ${MAX_PASSWORD_BYTES} bytes`
    }
    return null
}
