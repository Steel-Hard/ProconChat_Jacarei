import { fileURLToPath } from "node:url"
import { defineConfig, coverageConfigDefaults } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url))
        }
    },
    test: {
        environment: "jsdom",
        pool: "vmThreads",
        setupFiles: ["./src/setupTests.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "json-summary", "html"],
            exclude: [
                ...coverageConfigDefaults.exclude,
                "src/index.tsx",
                "src/types/**",
                "vite.config.ts",
                "src/setupTests.ts"
            ],
            thresholds: {
                statements: 80,
                branches: 80,
                functions: 80,
                lines: 80
            }
        }
    }
})
