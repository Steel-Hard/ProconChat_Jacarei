import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["tests/integration/**/*.test.ts"],
        fileParallelism: false,
        env: {
            PHONE_HASH_SECRET: "test-only-phone-hash-secret",
            CPF_HASH_SECRET: "test-only-cpf-hash-secret",
            ENCRYPTION_KEY: "test-only-encryption-key-for-aes256",
            GATEWAY_INTERNAL_TOKEN: "test-only-internal-token",
            AUTH_TOKEN_SECRET: "test-only-auth-token-secret-with-32-chars",
            FRONTEND_ORIGIN: "http://localhost:5173",
        },
    },
})
