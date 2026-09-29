import { describe, expect, it } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import RootLayout from "@/layouts/Root.layout"

describe("RootLayout", () => {
    it("renderiza a rota filha", () => {
        const router = createMemoryRouter(
            [{ element: <RootLayout />, children: [{ path: "/", element: <p>Filha</p> }] }],
            { initialEntries: ["/"] }
        )

        render(<RouterProvider router={router} />)

        expect(screen.getByText("Filha")).toBeInTheDocument()
    })
})
