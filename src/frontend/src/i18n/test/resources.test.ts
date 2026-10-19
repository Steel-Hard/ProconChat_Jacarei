import { describe, expect, it } from "vitest"
import resources from "@/i18n/resources"

function collectEntries(value: unknown, path = ""): [string, unknown][] {
    if (typeof value !== "object" || value === null) {
        return [[path, value]]
    }

    return Object.entries(value).flatMap(([key, child]) =>
        collectEntries(child, path ? `${path}.${key}` : key)
    )
}

describe("resources", () => {
    it("declara só pt-BR", () => {
        expect(Object.keys(resources)).toEqual(["pt-BR"])
    })

    it("não tem valor vazio nem que não seja texto", () => {
        for (const [path, value] of collectEntries(resources["pt-BR"])) {
            expect(typeof value, path).toBe("string")
            expect(value, path).not.toBe("")
        }
    })
})
