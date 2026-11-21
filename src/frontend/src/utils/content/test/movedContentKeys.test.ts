import { describe, expect, it } from "vitest"
import movedContentKeys from "@/utils/content/movedContentKeys"

describe("movedContentKeys", () => {
    it("ordem igual não marca ninguém", () => {
        expect(movedContentKeys(["1", "2", "3"], ["1", "2", "3"]).size).toBe(0)
    })

    it("troca de vizinhos marca os dois", () => {
        expect([...movedContentKeys(["1", "2", "3"], ["2", "1", "3"])].toSorted()).toEqual([
            "1",
            "2"
        ])
    })

    it("item novo no fim não marca os já gravados", () => {
        expect(movedContentKeys(["1", "2"], ["1", "2", "nova-1"]).size).toBe(0)
    })

    it("item novo no meio não marca os gravados que mantêm a ordem relativa", () => {
        expect(movedContentKeys(["1", "2"], ["1", "nova-1", "2"]).size).toBe(0)
    })

    it("ignora itens gravados que sumiram da lista do rascunho", () => {
        expect(movedContentKeys(["1", "2", "3"], ["1", "3"]).size).toBe(0)
    })
})
