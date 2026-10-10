import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, renderHook, screen } from "@testing-library/react"
import ToastProvider, { TOAST_DURATION_MS } from "@/components/ToastProvider"
import { useToast } from "@/hooks/useToast"

function ToastTrigger() {
    const { showToast } = useToast()

    return (
        <>
            <button
                type="button"
                onClick={() => showToast("Agendamento A3F9C21B assumido por você.")}
            >
                Primeiro
            </button>
            <button type="button" onClick={() => showToast("Alterações salvas.")}>
                Segundo
            </button>
        </>
    )
}

function renderToast() {
    render(
        <ToastProvider>
            <ToastTrigger />
        </ToastProvider>
    )
}

function click(name: string) {
    act(() => {
        screen.getByRole("button", { name }).click()
    })
}

describe("ToastProvider", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it("mostra a mensagem numa região de status", () => {
        renderToast()

        click("Primeiro")

        expect(screen.getByRole("status")).toHaveTextContent(
            "Agendamento A3F9C21B assumido por você."
        )
    })

    it("esconde a mensagem depois de 2600 ms", () => {
        renderToast()
        click("Primeiro")

        act(() => {
            vi.advanceTimersByTime(TOAST_DURATION_MS - 1)
        })
        expect(screen.getByRole("status")).toHaveTextContent("Agendamento A3F9C21B")

        act(() => {
            vi.advanceTimersByTime(1)
        })
        expect(screen.getByRole("status")).toBeEmptyDOMElement()
    })

    it("substitui o toast anterior e reinicia o prazo", () => {
        renderToast()
        click("Primeiro")
        act(() => {
            vi.advanceTimersByTime(2000)
        })

        click("Segundo")
        expect(screen.getByRole("status")).toHaveTextContent("Alterações salvas.")
        expect(
            screen.queryByText("Agendamento A3F9C21B assumido por você.")
        ).not.toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(2000)
        })
        expect(screen.getByRole("status")).toHaveTextContent("Alterações salvas.")

        act(() => {
            vi.advanceTimersByTime(600)
        })
        expect(screen.getByRole("status")).toBeEmptyDOMElement()
    })

    it("lança erro claro quando useToast é usado fora do ToastProvider", () => {
        vi.spyOn(console, "error").mockImplementation(() => {})

        expect(() => renderHook(() => useToast())).toThrow(
            "useToast precisa estar dentro de ToastProvider"
        )
    })

    it("limpa o temporizador ao desmontar com toast pendente", () => {
        const { unmount } = render(
            <ToastProvider>
                <ToastTrigger />
            </ToastProvider>
        )
        click("Primeiro")
        expect(vi.getTimerCount()).toBe(1)

        unmount()

        expect(vi.getTimerCount()).toBe(0)
    })
})
