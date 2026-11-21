import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import ContentPage from "@/pages/Content.page"

const FIXED_NOTICE =
    "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."

describe("ContentPage", () => {
    it("mostra o título da tela", () => {
        render(<ContentPage />)

        expect(screen.getByRole("heading", { name: "Conteúdo do chatbot" })).toBeInTheDocument()
    })

    it("mostra o aviso fixo com o texto oficial e sem ação de edição", () => {
        render(<ContentPage />)

        expect(screen.getByText(FIXED_NOTICE)).toBeInTheDocument()
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument()
    })
})
