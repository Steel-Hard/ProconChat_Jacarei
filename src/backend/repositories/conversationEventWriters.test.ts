import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"

const backendRoot = join(__dirname, "..")

const ignoredDirectories = new Set(["node_modules", "dist", "tests", join("db", "migrations"), join("db", "seeds")])

function productionFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name)
        const relativePath = relative(backendRoot, path)

        if (entry.isDirectory()) {
            return ignoredDirectories.has(relativePath) ? [] : productionFiles(path)
        }

        if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) {
            return []
        }

        return [relativePath.split(sep).join("/")]
    })
}

function filesMatching(pattern: RegExp): string[] {
    return productionFiles(backendRoot).filter((file) =>
        pattern.test(readFileSync(join(backendRoot, file), "utf8")),
    )
}

describe("escrita única em ConversationEvents e no encerramento de sessões", () => {
    it("só os repositórios de eventos e de sessões inserem em ConversationEvents", () => {
        const allowed = ["repositories/conversationEvent.repository.ts", "repositories/session.repository.ts"]

        const writers = filesMatching(/insert\s+into\s+conversationevents\b/i)

        expect(writers.filter((file) => !allowed.includes(file))).toEqual([])
        expect(writers).toContain("repositories/conversationEvent.repository.ts")
    })

    it("só o repositório de sessões encerra uma sessão com status FINISHED", () => {
        const writers = filesMatching(/update\s+sessions\b[^`;]*?status\s*=\s*'FINISHED'/i)

        expect(writers).toEqual(["repositories/session.repository.ts"])
    })
})
