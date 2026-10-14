import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["tests/integration/**/*.test.ts"],
        fileParallelism: false,
        env: {
            AUTH_TOKEN_SECRET: "test-only-auth-token-secret-with-32-chars",
            ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            FRONTEND_ORIGIN: "http://localhost:5173",
        },
    },
})
