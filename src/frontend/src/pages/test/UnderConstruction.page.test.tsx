import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import UnderConstructionPage from "@/pages/UnderConstruction.page"

describe("UnderConstructionPage", () => {
    it("mostra o título recebido e o aviso de construção", () => {
        render(<UnderConstructionPage titleKey="appointments" />)

        expect(screen.getByRole("heading", { name: "Agendamentos" })).toBeInTheDocument()
        expect(screen.getByText("Em construção.")).toBeInTheDocument()
    })

    it("define o title e a meta description da página", () => {
        render(<UnderConstructionPage titleKey="appointments" />)

        expect(document.title).toBe("Agendamentos - ProconChat")
        expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
            "Tela de Agendamentos em construção."
        )
    })
})
