import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildReportsSummary from "@/testUtils/buildReportsSummary"
import renderReportsPage from "@/testUtils/renderReportsPage"

vi.setConfig({ testTimeout: 30000 })

function card(name: string): HTMLElement {
    return screen.getByRole("heading", { level: 2, name }).closest("section") as HTMLElement
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("Reports: Categorias mais usadas", () => {
    it("lista as categorias com contagem em milhar e aria-label", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const items = within(card("Categorias mais usadas")).getAllByRole("listitem")

        expect(items).toHaveLength(2)
        expect(within(items[0] as HTMLElement).getByText("Consumidor")).toBeInTheDocument()
        expect(within(items[0] as HTMLElement).getByLabelText("1.200 conversas")).toHaveTextContent(
            "1.200"
        )
    })

    it("dimensiona as barras pela maior contagem", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const bars = within(card("Categorias mais usadas")).getAllByTestId("category-bar")

        expect((bars[0] as HTMLElement).style.width).toBe("100%")
        expect((bars[1] as HTMLElement).style.width).toBe("50%")
    })

    it("explica a contagem com a regra de conversas distintas", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        await page.user.click(
            screen.getByRole("button", { name: "Definição das categorias mais usadas" })
        )

        expect(screen.getByRole("tooltip")).toHaveTextContent(
            "Quantidade de conversas distintas que escolheram cada categoria no período. Escolher o mesmo item de novo na mesma conversa conta uma vez."
        )
    })

    it("mostra o texto de vazio sem categorias", async () => {
        const page = await renderReportsPage({
            summary: buildReportsSummary({ topCategories: [] })
        })
        await page.loaded()

        expect(screen.getByText("Nenhuma categoria escolhida neste período.")).toBeInTheDocument()
    })
})

describe("Reports: Perguntas mais usadas", () => {
    it("mostra a posição, o enunciado completo, a categoria e a contagem", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const item = within(card("Perguntas mais usadas")).getByRole("listitem")

        expect(within(item).getByText("1")).toBeInTheDocument()
        expect(within(item).getByText("Como contestar uma cobrança indevida?")).toBeInTheDocument()
        expect(within(item).getByText("Consumidor")).toBeInTheDocument()
        expect(within(item).getByLabelText("9 conversas")).toHaveTextContent("9")
    })

    it("não mostra o título curto no lugar do enunciado", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        expect(screen.queryByText("Cobrança indevida")).toBeNull()
    })

    it("explica a contagem com a regra de conversas distintas", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        await page.user.click(
            screen.getByRole("button", { name: "Definição das perguntas mais usadas" })
        )

        expect(screen.getByRole("tooltip")).toHaveTextContent(
            "Quantidade de conversas distintas que escolheram cada pergunta no período. Escolher o mesmo item de novo na mesma conversa conta uma vez."
        )
    })

    it("mostra o texto de vazio sem perguntas", async () => {
        const page = await renderReportsPage({
            summary: buildReportsSummary({ topQuestions: [] })
        })
        await page.loaded()

        expect(screen.getByText("Nenhuma pergunta escolhida neste período.")).toBeInTheDocument()
    })

    it("põe os dois cartões na mesma linha de ranking", async () => {
        const page = await renderReportsPage()
        await page.loaded()

        const row = card("Categorias mais usadas").parentElement as HTMLElement

        expect(row.className).toContain("rankings")
        expect(row).toContainElement(card("Perguntas mais usadas"))
    })
})
