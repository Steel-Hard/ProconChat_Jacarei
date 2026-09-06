import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["**/*.test.ts"],
        exclude: ["node_modules", "dist"],
        env: {
            DB_URL: "postgres://test:test@localhost:5432/proconchat_test",
        },
    },
})
