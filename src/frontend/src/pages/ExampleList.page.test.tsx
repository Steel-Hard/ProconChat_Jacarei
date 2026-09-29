import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import ExampleListPage from "@/pages/ExampleList.page"
import { useExampleList } from "@/pages/hooks/useExampleList"
import type { ExampleListState } from "@/pages/hooks/useExampleList"
import type { ExampleEntity } from "@/types/example.types"

vi.mock("@/pages/hooks/useExampleList", () => ({
    useExampleList: vi.fn()
}))

const mockedUseExampleList = vi.mocked(useExampleList)

function createExampleEntity(overrides: Partial<ExampleEntity> = {}): ExampleEntity {
    return {
        id: "1",
        name: "Exemplo A",
        active: true,
        createdAt: "2024-01-15T12:00:00.000Z",
        ...overrides
    }
}

function mockState(state: ExampleListState) {
    mockedUseExampleList.mockReturnValue(state)
}

describe("ExampleListPage", () => {
    it("mostra o estado de carregando quando o hook retorna loading", () => {
        mockState({ status: "loading" })

        render(<ExampleListPage />)

        expect(screen.getByText("Carregando exemplos...")).toBeInTheDocument()
    })

    it("mostra o nome e a data formatada de cada exemplo quando o hook retorna sucesso", () => {
        mockState({ status: "success", entities: [createExampleEntity()] })

        render(<ExampleListPage />)

        expect(screen.getByText("Exemplo A")).toBeInTheDocument()
        expect(screen.getByText("15/01/2024")).toBeInTheDocument()
    })

    it("mostra a mensagem de lista vazia quando o hook retorna sucesso sem exemplos", () => {
        mockState({ status: "success", entities: [] })

        render(<ExampleListPage />)

        expect(screen.getByText("Nenhum exemplo encontrado.")).toBeInTheDocument()
        expect(screen.queryByText("Carregando exemplos...")).not.toBeInTheDocument()
    })

    it("mostra uma mensagem de alerta quando o hook retorna erro", () => {
        mockState({ status: "error", message: "Falha ao buscar exemplos." })

        render(<ExampleListPage />)

        expect(screen.getByRole("alert")).toHaveTextContent("Falha ao buscar exemplos.")
        expect(screen.queryByRole("list")).not.toBeInTheDocument()
    })
})
