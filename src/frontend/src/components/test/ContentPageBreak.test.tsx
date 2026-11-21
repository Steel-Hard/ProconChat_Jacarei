import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import ContentPageBreak from "@/components/ContentPageBreak"

describe("ContentPageBreak", () => {
    it("mostra o separador com o número da página do WhatsApp", () => {
        render(
            <ul>
                <ContentPageBreak page={2} />
            </ul>
        )

        const separator = screen.getByRole("separator")

        expect(separator).toHaveTextContent("Página 2 no WhatsApp")
    })

    it("não usa papel de alerta, porque é só informação", () => {
        render(
            <ul>
                <ContentPageBreak page={3} />
            </ul>
        )

        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
        expect(screen.getByRole("separator")).toHaveTextContent("Página 3 no WhatsApp")
    })
})
