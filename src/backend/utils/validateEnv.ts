import { ENCRYPTION_KEY_ERROR, isValidEncryptionKey } from "./crypto.utils"

const requiredEnvVars = ["DB_URL", "PHONE_HASH_SECRET", "GATEWAY_INTERNAL_TOKEN", "AUTH_TOKEN_SECRET", "ENCRYPTION_KEY"]

const MIN_AUTH_TOKEN_SECRET_LENGTH = 32

function isHttpUrl(value: string): boolean {
    try {
        const { protocol } = new URL(value)
        return protocol === "http:" || protocol === "https:"
    } catch {
        return false
    }
}

export default function validateEnv(): void {
    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

    if (missingEnvVars.length > 0) {
        console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`)
        process.exit(1)
        return
    }

    if ((process.env.AUTH_TOKEN_SECRET ?? "").length < MIN_AUTH_TOKEN_SECRET_LENGTH) {
        console.error(`AUTH_TOKEN_SECRET must contain at least ${MIN_AUTH_TOKEN_SECRET_LENGTH} characters`)
        process.exit(1)
        return
    }

    if (!isValidEncryptionKey(process.env.ENCRYPTION_KEY)) {
        console.error(ENCRYPTION_KEY_ERROR)
        process.exit(1)
        return
    }

    const frontendOrigin = process.env.FRONTEND_ORIGIN
    if (frontendOrigin !== undefined && !isHttpUrl(frontendOrigin)) {
        console.error("FRONTEND_ORIGIN must be an http or https URL")
        process.exit(1)
    }
}
