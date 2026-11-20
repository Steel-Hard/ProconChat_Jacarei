import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildReportsSummary from "@/testUtils/buildReportsSummary"
import renderReportsPage from "@/testUtils/renderReportsPage"

vi.setConfig({ testTimeout: 30000 })

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("Reports: estados", () => {
    it("na primeira carga mostra só o aviso Carregando… com role status", async () => {
        const page = await renderReportsPage({
            handler: async () => {
                await sleep(400)

                return { status: 200, body: { data: buildReportsSummary() } }
            }
        })

        expect(screen.getByRole("status")).toHaveTextContent("Carregando…")
        expect(screen.queryByRole("heading", { level: 2 })).toBeNull()
        await page.loaded()
        expect(screen.queryByRole("status")).toBeNull()
    })

    it("ao trocar o período mantém os dados anteriores esmaecidos e aria-busy", async () => {
        let calls = 0
        const page = await renderReportsPage({
            handler: async () => {
                calls += 1

                if (calls > 1) {
                    await sleep(500)
                }

                return { status: 200, body: { data: buildReportsSummary() } }
            }
        })
        await page.loaded()

        await page.user.click(screen.getByRole("button", { name: "Últimos 7 dias" }))

        const content = screen
            .getByRole("heading", { level: 2, name: "Desfecho das conversas" })
            .closest("[aria-busy]") as HTMLElement

        expect(content).toHaveAttribute("aria-busy", "true")
        expect(content.className).toContain("refreshing")
        expect(screen.getByRole("button", { name: "Últimos 30 dias" })).toBeEnabled()
        await waitFor(() => expect(content).toHaveAttribute("aria-busy", "false"))
    })

    it("no erro mostra só o alerta, esconde os números e mantém o cabeçalho e os chips", async () => {
        const page = await renderReportsPage({
            handler: () => ({ status: 500, body: { error: { code: "INTERNAL_SERVER_ERROR" } } })
        })

        const alert = await screen.findByRole("alert")

        expect(alert).toHaveTextContent("Não foi possível carregar os relatórios.")
        expect(screen.queryByRole("heading", { level: 2 })).toBeNull()
        expect(screen.getByRole("heading", { level: 1, name: "Relatórios" })).toBeInTheDocument()
        expect(
            within(screen.getByRole("group", { name: "Período" })).getAllByRole("button")
        ).toHaveLength(6)
        expect(page.requests()).toHaveLength(1)
    })

    it("tentar novamente consulta de novo e volta as seções", async () => {
        let fail = true
        const page = await renderReportsPage({
            handler: () =>
                fail
                    ? { status: 500, body: { error: { code: "INTERNAL_SERVER_ERROR" } } }
                    : { status: 200, body: { data: buildReportsSummary() } }
        })
        await screen.findByRole("alert")
        fail = false

        await page.user.click(screen.getByRole("button", { name: "Tentar novamente" }))

        await page.loaded()
        expect(screen.queryByRole("alert")).toBeNull()
    })

    it("não mostra números antigos quando uma nova consulta falha", async () => {
        let fail = false
        const page = await renderReportsPage({
            handler: () =>
                fail
                    ? { status: 500, body: { error: { code: "INTERNAL_SERVER_ERROR" } } }
                    : { status: 200, body: { data: buildReportsSummary() } }
        })
        await page.loaded()
        fail = true

        await page.user.click(screen.getByRole("button", { name: "Últimos 7 dias" }))

        expect(await screen.findByRole("alert")).toBeInTheDocument()
        expect(screen.queryByRole("heading", { level: 2 })).toBeNull()
    })
})

describe("Reports: subtítulo e primeira carga", () => {
    it("volta ao subtítulo base quando a consulta falha, sem mostrar o período anterior", async () => {
        let fail = false
        const page = await renderReportsPage({
            handler: () =>
                fail
                    ? { status: 500, body: { error: { code: "INTERNAL_SERVER_ERROR" } } }
                    : { status: 200, body: { data: buildReportsSummary() } }
        })
        await page.loaded()
        expect(screen.getByText(/· 08\/10 a 06\/11\/2026/)).toBeInTheDocument()
        fail = true

        await page.user.click(screen.getByRole("button", { name: "Últimos 7 dias" }))
        await screen.findByRole("alert")

        expect(
            screen.getByText("Uso do chatbot e dos agendamentos presenciais")
        ).toBeInTheDocument()
        expect(screen.queryByText(/08\/10/)).toBeNull()
    })

    it("durante a nova tentativa depois de um erro mostra Carregando… e não um quadro vazio", async () => {
        let fail = true
        const page = await renderReportsPage({
            handler: async () => {
                if (fail) {
                    return { status: 500, body: { error: { code: "INTERNAL_SERVER_ERROR" } } }
                }

                await sleep(500)

                return { status: 200, body: { data: buildReportsSummary() } }
            }
        })
        await screen.findByRole("alert")
        fail = false

        await page.user.click(screen.getByRole("button", { name: "Tentar novamente" }))

        expect(screen.getByRole("status")).toHaveTextContent("Carregando…")
        expect(screen.queryByRole("alert")).toBeNull()
        await page.loaded()
    })
})

describe("Reports: acessibilidade", () => {
    it("define o título da aba", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        await waitFor(() => expect(document.title).toBe("Relatórios - ProconChat"))
    })

    it("nomeia as listas pelos títulos dos cartões", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        expect(screen.getByRole("list", { name: "Desfecho das conversas" })).toBeInTheDocument()
        expect(screen.getByRole("list", { name: "Categorias mais usadas" })).toBeInTheDocument()
        expect(screen.getByRole("list", { name: "Perguntas mais usadas" })).toBeInTheDocument()
    })
})
