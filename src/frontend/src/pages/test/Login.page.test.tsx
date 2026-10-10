import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import LoginPage from "@/pages/Login.page"

describe("LoginPage", () => {
    it("mostra o placeholder da tela de entrada", () => {
        render(<LoginPage />)

        expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument()
    })
})
