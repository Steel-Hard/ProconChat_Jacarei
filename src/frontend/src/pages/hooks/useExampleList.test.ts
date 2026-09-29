import { describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useExampleList } from "@/pages/hooks/useExampleList"
import { get } from "@/services/http.service"
import type { ExampleEntity } from "@/types/example.types"

vi.mock("@/services/http.service", () => ({
    get: vi.fn()
}))

const mockedGet = vi.mocked(get)

function createExampleEntity(overrides: Partial<ExampleEntity> = {}): ExampleEntity {
    return {
        id: "1",
        name: "Exemplo A",
        active: true,
        createdAt: "2024-01-15T12:00:00.000Z",
        ...overrides
    }
}

describe("useExampleList", () => {
    it("começa com o estado de carregando", () => {
        mockedGet.mockReturnValueOnce(new Promise(() => {}))

        const { result } = renderHook(() => useExampleList())

        expect(result.current).toEqual({ status: "loading" })
    })

    it("retorna sucesso com as entidades quando a busca resolve", async () => {
        const entities = [createExampleEntity()]
        mockedGet.mockResolvedValueOnce(entities)

        const { result } = renderHook(() => useExampleList())

        await waitFor(() => {
            expect(result.current).toEqual({ status: "success", entities })
        })
    })

    it("retorna sucesso com lista vazia quando não há entidades", async () => {
        mockedGet.mockResolvedValueOnce([])

        const { result } = renderHook(() => useExampleList())

        await waitFor(() => {
            expect(result.current).toEqual({ status: "success", entities: [] })
        })
    })

    it("retorna erro com a mensagem do Error lançado quando a busca falha", async () => {
        mockedGet.mockRejectedValueOnce(new Error("Falha ao buscar exemplos."))

        const { result } = renderHook(() => useExampleList())

        await waitFor(() => {
            expect(result.current).toEqual({
                status: "error",
                message: "Falha ao buscar exemplos."
            })
        })
    })

    it("retorna erro com mensagem padrão quando o valor rejeitado não é um Error", async () => {
        mockedGet.mockRejectedValueOnce("falha desconhecida")

        const { result } = renderHook(() => useExampleList())

        await waitFor(() => {
            expect(result.current).toEqual({
                status: "error",
                message: "Não foi possível carregar os exemplos."
            })
        })
    })

    it("não atualiza o estado quando a promise resolve depois do unmount", async () => {
        let resolveGet!: (entities: ExampleEntity[]) => void
        mockedGet.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveGet = resolve
            })
        )
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

        const { unmount } = renderHook(() => useExampleList())
        unmount()
        resolveGet([createExampleEntity()])
        await Promise.resolve()

        expect(errorSpy).not.toHaveBeenCalled()
        expect(warnSpy).not.toHaveBeenCalled()

        errorSpy.mockRestore()
        warnSpy.mockRestore()
    })
})
