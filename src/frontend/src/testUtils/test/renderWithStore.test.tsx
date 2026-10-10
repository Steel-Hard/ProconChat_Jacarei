import { afterEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"

async function setup() {
    vi.stubEnv("VITE_API_URL", "https://api.example.com")
    vi.resetModules()
    const { default: api } = await import("@/store/api")
    const { default: renderWithStore } = await import("@/testUtils/renderWithStore")
    const fetchMock = vi.fn().mockImplementation(
        async () =>
            new Response(JSON.stringify({ name: "Exemplo" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
    )
    vi.stubGlobal("fetch", fetchMock)

    const profileApi = api.injectEndpoints({
        endpoints: (build) => ({
            getProfile: build.query<{ name: string }, void>({ query: () => "/profile" })
        })
    })

    function Profile() {
        const { data } = profileApi.useGetProfileQuery()
        return <p>{data ? data.name : "carregando"}</p>
    }

    return { renderWithStore, Profile, fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("renderWithStore", () => {
    it("renderiza o componente que consome o hook da api injetada", async () => {
        const { renderWithStore, Profile } = await setup()

        renderWithStore(<Profile />)

        expect(await screen.findByText("Exemplo")).toBeInTheDocument()
    })

    it("devolve a store usada no render", async () => {
        const { renderWithStore, Profile } = await setup()

        const { store } = renderWithStore(<Profile />)

        expect(store.getState()).toHaveProperty("api")
    })

    it("cria uma store com cache independente a cada chamada", async () => {
        const { renderWithStore, Profile, fetchMock } = await setup()

        const first = renderWithStore(<Profile />)
        await screen.findByText("Exemplo")
        first.unmount()
        const second = renderWithStore(<Profile />)
        await screen.findByText("Exemplo")

        expect(second.store).not.toBe(first.store)
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })
})
