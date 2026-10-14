const requiredEnvVars = ["DB_URL", "PHONE_HASH_SECRET", "GATEWAY_INTERNAL_TOKEN", "AUTH_TOKEN_SECRET"]

const MIN_AUTH_TOKEN_SECRET_LENGTH = 32

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
    }
}
