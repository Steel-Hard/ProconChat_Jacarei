import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["**/*.test.ts"],
        exclude: ["node_modules", "dist"],
        env: {
            EVOLUTION_WEBHOOK_TOKEN: "test-only-webhook-token",
            EVOLUTION_API_URL: "http://evolution-api:8080",
            EVOLUTION_API_KEY: "test-only-api-key",
            EVOLUTION_AUTO_REPLY_ENABLED: "false",
            BACKEND_INTERNAL_URL: "http://backend:3000",
            GATEWAY_INTERNAL_TOKEN: "test-only-internal-token",
            WHATSAPP_PHONE_NUMBER_ID: "100000000000001",
            WHATSAPP_ACCESS_TOKEN: "test-only-access-token",
            WHATSAPP_APP_SECRET: "test-only-app-secret",
            WHATSAPP_VERIFY_TOKEN: "test-only-verify-token",
            WHATSAPP_GRAPH_API_VERSION: "v26.0",
        },
    },
})
