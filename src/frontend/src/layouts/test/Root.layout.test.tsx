import { lazy } from "react"
import { describe, expect, it } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import RootLayout from "@/layouts/Root.layout"

const NeverResolves = lazy(() => new Promise<never>(() => {}))

describe("RootLayout", () => {
    it("renderiza a rota filha", () => {
        const router = createMemoryRouter(
            [{ element: <RootLayout />, children: [{ path: "/", element: <p>Filha</p> }] }],
            { initialEntries: ["/"] }
        )

        render(<RouterProvider router={router} />)

        expect(screen.getByText("Filha")).toBeInTheDocument()
    })

    it("mostra o carregamento enquanto a página lazy não resolve", () => {
        const router = createMemoryRouter(
            [{ element: <RootLayout />, children: [{ path: "/", element: <NeverResolves /> }] }],
            { initialEntries: ["/"] }
        )

        render(<RouterProvider router={router} />)

        expect(screen.getByText("Carregando...")).toBeInTheDocument()
    })
})
