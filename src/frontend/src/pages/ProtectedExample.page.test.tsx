import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import ProtectedExamplePage from "@/pages/ProtectedExample.page"

describe("ProtectedExamplePage", () => {
    it("renderiza o título principal", () => {
        render(<ProtectedExamplePage />)

        expect(screen.getByRole("heading", { name: "Área protegida" })).toBeInTheDocument()
    })

    it("renderiza o texto de acesso restrito", () => {
        render(<ProtectedExamplePage />)

        expect(screen.getByText("Você só vê isso se estiver autenticado.")).toBeInTheDocument()
    })
})
