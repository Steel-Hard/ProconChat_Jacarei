import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import useLogout from "@/hooks/useLogout"
import renderWithStore from "@/testUtils/renderWithStore"

function LogoutButton() {
    const logout = useLogout()

    return (
        <button type="button" onClick={logout}>
            Sair
        </button>
    )
}

describe("useLogout", () => {
    it("limpa a conta", async () => {
        const user = userEvent.setup()
        const { store } = renderWithStore(<LogoutButton />, {
            preloadedState: {
                account: {
                    status: "authenticated",
                    current: {
                        id: 1,
                        name: "Ana",
                        email: "ana@exemplo.gov.br",
                        isAdmin: true,
                        permissions: []
                    }
                }
            }
        })

        await user.click(screen.getByRole("button", { name: "Sair" }))

        expect(store.getState().account.current).toBeNull()
    })
})
