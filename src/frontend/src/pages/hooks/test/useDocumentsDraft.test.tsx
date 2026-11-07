import { describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import useDocumentsDraft from "@/pages/hooks/useDocumentsDraft"

describe("useDocumentsDraft", () => {
    const initialConfig = {
        holder: ["RG", "CPF"],
        representative: ["RG do titular", "Procuração"]
    }

    it("inicializa com os dados do servidor", () => {
        const { result } = renderHook(() => useDocumentsDraft(initialConfig))

        expect(result.current.holder).toEqual(["RG", "CPF"])
        expect(result.current.representative).toEqual(["RG do titular", "Procuração"])
        expect(result.current.hasChanges).toBe(false)
        expect(result.current.changes).toEqual([])
    })

    it("adiciona, edita, move e remove itens do titular", () => {
        const { result } = renderHook(() => useDocumentsDraft(initialConfig))

        act(() => {
            result.current.actions.addItem("holder", "Comprovante de endereço")
        })
        expect(result.current.holder).toEqual(["RG", "CPF", "Comprovante de endereço"])
        expect(result.current.hasChanges).toBe(true)

        act(() => {
            result.current.actions.moveUp("holder", 1)
        })
        expect(result.current.holder).toEqual(["CPF", "RG", "Comprovante de endereço"])

        act(() => {
            result.current.actions.moveDown("holder", 0)
        })
        expect(result.current.holder).toEqual(["RG", "CPF", "Comprovante de endereço"])

        act(() => {
            result.current.actions.editItem("holder", 0, "Documento de identidade (RG)")
        })
        expect(result.current.holder[0]).toBe("Documento de identidade (RG)")

        act(() => {
            result.current.actions.removeItem("holder", 1)
        })
        expect(result.current.holder).toEqual([
            "Documento de identidade (RG)",
            "Comprovante de endereço"
        ])
    })

    it("descartar reverte as alterações para o estado inicial", () => {
        const { result } = renderHook(() => useDocumentsDraft(initialConfig))

        act(() => {
            result.current.actions.addItem("representative", "Novo doc")
        })
        expect(result.current.hasChanges).toBe(true)

        act(() => {
            result.current.actions.discard()
        })
        expect(result.current.hasChanges).toBe(false)
        expect(result.current.representative).toEqual(["RG do titular", "Procuração"])
    })

    it("identifica corretamente se um grupo ficou vazio", () => {
        const { result } = renderHook(() => useDocumentsDraft(initialConfig))

        act(() => {
            result.current.actions.removeItem("holder", 0)
            result.current.actions.removeItem("holder", 0)
        })

        expect(result.current.holder).toEqual([])
        expect(result.current.isHolderEmpty).toBe(true)
        expect(result.current.isRepresentativeEmpty).toBe(false)
    })

    it("descarta o rascunho quando a configuração do servidor muda", () => {
        const { result, rerender } = renderHook(({ config }) => useDocumentsDraft(config), {
            initialProps: { config: initialConfig }
        })

        act(() => {
            result.current.actions.addItem("holder", "Documento local")
        })
        expect(result.current.holder).toContain("Documento local")

        const updatedConfig = {
            holder: ["Novo RG"],
            representative: ["Nova procuração"]
        }
        rerender({ config: updatedConfig })

        expect(result.current.holder).toEqual(["Novo RG"])
        expect(result.current.representative).toEqual(["Nova procuração"])
        expect(result.current.hasChanges).toBe(false)
    })
})
