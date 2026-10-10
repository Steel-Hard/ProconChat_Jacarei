import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import useLogout from "@/hooks/useLogout"
import getToken from "@/services/session/getToken"
import setToken from "@/services/session/setToken"
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
    it("limpa o token e a conta", async () => {
        const user = userEvent.setup()
        setToken("abc")
        const { store } = renderWithStore(<LogoutButton />, {
            preloadedState: {
                account: {
                    current: {
                        name: "Ana",
                        email: "ana@exemplo.gov.br",
                        isAdmin: true,
                        permissions: []
                    }
                }
            }
        })

        await user.click(screen.getByRole("button", { name: "Sair" }))

        expect(getToken()).toBeNull()
        expect(store.getState().account.current).toBeNull()
    })
})
