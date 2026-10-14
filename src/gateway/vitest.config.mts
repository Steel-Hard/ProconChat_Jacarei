import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["**/*.test.ts"],
        exclude: ["node_modules", "dist"],
        env: {
            BACKEND_INTERNAL_URL: "http://backend:3000",
            GATEWAY_INTERNAL_TOKEN: "test-only-internal-token",
        },
    },
})
