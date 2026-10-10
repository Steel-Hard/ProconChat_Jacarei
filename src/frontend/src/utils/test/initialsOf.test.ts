import { describe, expect, it } from "vitest"
import initialsOf from "@/utils/initialsOf"

describe("initialsOf", () => {
    it.each([
        ["Ana Paula Souza", "AS"],
        ["bruno", "B"],
        ["  maria   da silva  ", "MS"],
        ["", ""]
    ])("devolve as iniciais de %j", (name, expected) => {
        expect(initialsOf(name)).toBe(expected)
    })
})
