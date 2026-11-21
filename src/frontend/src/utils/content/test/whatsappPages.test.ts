import { describe, expect, it } from "vitest"
import whatsappPages from "@/utils/content/whatsappPages"

function items(count: number, inactiveAt: number[] = []) {
    return Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        active: !inactiveAt.includes(index)
    }))
}

function breaksOf(count: number, inactiveAt: number[] = []) {
    return whatsappPages(items(count, inactiveAt), (item) => item.active)
        .filter((entry) => entry.pageBreak !== null)
        .map((entry) => [entry.item.id, entry.pageBreak])
}

describe("whatsappPages", () => {
    it("não marca página com 10 itens ativos", () => {
        expect(breaksOf(10)).toEqual([])
    })

    it("marca a página 2 antes do 10º item com 11 ativos", () => {
        expect(breaksOf(11)).toEqual([[10, 2]])
    })

    it("marca uma página só com 18 ativos", () => {
        expect(breaksOf(18)).toEqual([[10, 2]])
    })

    it("marca páginas 2 e 3 no 10º e no 18º com 19 ativos", () => {
        expect(breaksOf(19)).toEqual([
            [10, 2],
            [18, 3]
        ])
    })

    it("marca quatro páginas com 27 ativos", () => {
        expect(breaksOf(27)).toEqual([
            [10, 2],
            [18, 3],
            [26, 4]
        ])
    })

    it("ignora inativos na contagem e não dá página a eles", () => {
        const result = whatsappPages(items(12, [0, 1]), (item) => item.active)

        expect(result.every((entry) => entry.pageBreak === null)).toBe(true)
        expect(result[0].whatsappPage).toBeNull()
        expect(result[1].whatsappPage).toBeNull()
        expect(result[2].whatsappPage).toBe(1)
    })

    it("dá a página do WhatsApp a cada item ativo", () => {
        const pages = whatsappPages(items(19), () => true).map((entry) => entry.whatsappPage)

        expect(pages.slice(0, 9)).toEqual(Array(9).fill(1))
        expect(pages.slice(9, 17)).toEqual(Array(8).fill(2))
        expect(pages.slice(17)).toEqual([3, 3])
    })
})
