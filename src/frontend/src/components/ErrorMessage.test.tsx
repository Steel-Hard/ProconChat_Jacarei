import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import ErrorMessage from "@/components/ErrorMessage"

describe("ErrorMessage", () => {
    it("renderiza a mensagem recebida com papel de alerta", () => {
        render(<ErrorMessage message="Falha ao buscar exemplos." />)

        expect(screen.getByRole("alert")).toHaveTextContent("Falha ao buscar exemplos.")
    })
})
