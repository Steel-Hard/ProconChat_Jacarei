import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["**/*.test.ts"],
        exclude: ["node_modules", "dist", "tests/integration/**"],
        env: {
            DB_URL: "postgres://test:test@localhost:5432/proconchat_test",
            PHONE_HASH_SECRET: "test-only-phone-hash-secret",
            GATEWAY_INTERNAL_TOKEN: "test-only-internal-token",
        },
    },
})
