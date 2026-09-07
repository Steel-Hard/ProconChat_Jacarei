const requiredEnvVars = [
    "EVOLUTION_WEBHOOK_TOKEN",
    "BACKEND_INTERNAL_URL",
    "GATEWAY_INTERNAL_TOKEN",
]

export default function validateEnv(): void {
    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

    if (missingEnvVars.length > 0) {
        console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`)
        process.exit(1)
    }
}
