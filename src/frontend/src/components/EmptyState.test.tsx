import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import EmptyState from "@/components/EmptyState"

describe("EmptyState", () => {
    it("renderiza a mensagem recebida", () => {
        render(<EmptyState message="Nenhum exemplo encontrado." />)

        expect(screen.getByText("Nenhum exemplo encontrado.")).toBeInTheDocument()
    })
})
