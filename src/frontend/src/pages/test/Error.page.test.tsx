import { describe, expect, it } from "vitest"
import { RouterProvider, createMemoryRouter } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import ErrorPage from "@/pages/Error.page"

function ThrowingPage(): never {
    throw new Error("Falha proposital de teste")
}

function renderErrorPage() {
    const router = createMemoryRouter(
        [{ path: "/", element: <ThrowingPage />, errorElement: <ErrorPage /> }],
        { initialEntries: ["/"] }
    )

    return render(<RouterProvider router={router} />)
}

describe("ErrorPage", () => {
    it("renderiza o heading genérico de erro e a mensagem da exceção lançada", () => {
        renderErrorPage()

        expect(
            screen.getByRole("heading", { name: "Ocorreu um erro inesperado." })
        ).toBeInTheDocument()
        expect(screen.getByText("Falha proposital de teste")).toBeInTheDocument()
    })

    it("oferece um link de volta para a página inicial", () => {
        renderErrorPage()

        expect(screen.getByRole("link", { name: "Vá para a página inicial." })).toHaveAttribute(
            "href",
            "/"
        )
    })

    it("define o title e a meta description da página", () => {
        renderErrorPage()

        expect(document.title).toBe("Ocorreu um erro.")
        expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
            "Algo deu errado ao carregar esta página."
        )
    })
})
