import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["tests/integration/**/*.test.ts"],
        fileParallelism: false,
        env: {
            AUTH_TOKEN_SECRET: "test-only-auth-token-secret-with-at-least-32-characters",
        },
    },
})
