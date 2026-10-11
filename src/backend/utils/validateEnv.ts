const requiredEnvVars = ["DB_URL", "PHONE_HASH_SECRET", "GATEWAY_INTERNAL_TOKEN", "AUTH_TOKEN_SECRET"]

export default function validateEnv(): void {
    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

    if (missingEnvVars.length > 0) {
        console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`)
        process.exit(1)
    }

    if ((process.env.AUTH_TOKEN_SECRET?.length ?? 0) < 32) {
        console.error("AUTH_TOKEN_SECRET must contain at least 32 characters")
        process.exit(1)
    }
}
