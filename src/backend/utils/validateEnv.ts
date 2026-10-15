import { ENCRYPTION_KEY_ERROR, isValidEncryptionKey } from "./crypto.utils"

const requiredEnvVars = [
    "DB_URL",
    "PHONE_HASH_SECRET",
    "CPF_HASH_SECRET",
    "GATEWAY_INTERNAL_TOKEN",
    "AUTH_TOKEN_SECRET",
    "ENCRYPTION_KEY",
]

const MIN_AUTH_TOKEN_SECRET_LENGTH = 32
const GRAPH_API_VERSION_PATTERN = /^v\d+\.\d+$/
const OPTIONAL_URL_VARS = ["PUBLIC_BASE_URL", "GATEWAY_INTERNAL_URL"]

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
        return
    }

    const invalidUrlVar = OPTIONAL_URL_VARS.find((envVar) => {
        const value = process.env[envVar]
        return Boolean(value) && !isHttpUrl(value as string)
    })
    if (invalidUrlVar) {
        console.error(`${invalidUrlVar} must be an http or https URL`)
        process.exit(1)
        return
    }

    const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION
    if (graphApiVersion && !GRAPH_API_VERSION_PATTERN.test(graphApiVersion)) {
        console.error("WHATSAPP_GRAPH_API_VERSION must look like v26.0")
        process.exit(1)
    }
}
