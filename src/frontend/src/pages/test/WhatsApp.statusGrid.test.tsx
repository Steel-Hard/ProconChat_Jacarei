import { screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import renderWhatsAppPage from "@/testUtils/renderWhatsAppPage"

vi.setConfig({ testTimeout: 30000 })

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("WhatsApp: Estado do número", () => {
    it("põe os cinco quadros na mesma grade, na ordem credenciais, último evento, falhas, qualidade e limite", async () => {
        await renderWhatsAppPage()

        const heading = screen.getByRole("heading", { level: 2, name: "Estado do número" })
        const card = heading.closest("section") as HTMLElement
        const grid = card.querySelector(":scope > div") as HTMLElement

        await waitFor(() => expect(grid.children.length).toBe(5))

        const labels = Array.from(grid.children).map(
            (block) => block.querySelector("dt, h3")?.textContent ?? ""
        )
        expect(labels[0]).toMatch(/Credenciais/)
        expect(labels[1]).toMatch(/Último evento/)
        expect(labels[2]).toMatch(/Falhas de entrega/)
        expect(labels[3]).toMatch(/Qualidade/)
        expect(labels[4]).toMatch(/Limite/)
    })
})
