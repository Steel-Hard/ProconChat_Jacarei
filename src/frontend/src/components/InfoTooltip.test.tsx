import { describe, expect, it } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import InfoTooltip from "@/components/InfoTooltip"

const text = "Quantidade de mensagens recebidas nas últimas 24 horas."

function tap(element: HTMLElement) {
    fireEvent.pointerDown(element, { pointerType: "touch" })
    act(() => element.focus())
    fireEvent.pointerUp(element, { pointerType: "touch" })
    fireEvent.click(element, { detail: 1 })
}

describe("InfoTooltip", () => {
    it("começa fechado com o botão Mais informações", () => {
        render(<InfoTooltip text={text} />)

        expect(screen.getByRole("button", { name: "Mais informações" })).toBeInTheDocument()
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    })

    it("mostra o balão ao passar o mouse e esconde ao sair", () => {
        render(<InfoTooltip text={text} />)
        const button = screen.getByRole("button", { name: "Mais informações" })

        userEvent.hover(button)
        const tooltip = screen.getByRole("tooltip")
        expect(tooltip).toHaveTextContent(text)
        expect(button).toHaveAttribute("aria-describedby", tooltip.id)

        userEvent.unhover(button)
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    })

    it("mostra o balão ao receber foco e esconde com Esc", () => {
        render(<InfoTooltip text={text} />)

        userEvent.tab()
        expect(screen.getByRole("tooltip")).toHaveTextContent(text)

        userEvent.keyboard("{esc}")
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    })

    it("abre com um toque e fecha com o segundo", () => {
        render(<InfoTooltip text={text} />)
        const button = screen.getByRole("button", { name: "Mais informações" })

        tap(button)
        expect(screen.getByRole("tooltip")).toHaveTextContent(text)

        tap(button)
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    })

    it("mantém o balão aberto ao clicar com o mouse", () => {
        render(<InfoTooltip text={text} />)
        const button = screen.getByRole("button", { name: "Mais informações" })

        userEvent.click(button)
        expect(screen.getByRole("tooltip")).toHaveTextContent(text)

        userEvent.click(button)
        expect(screen.getByRole("tooltip")).toHaveTextContent(text)
    })

    it("alterna o balão com Enter pelo teclado", () => {
        render(<InfoTooltip text={text} />)
        userEvent.tab()
        expect(screen.getByRole("tooltip")).toBeInTheDocument()

        userEvent.keyboard("{enter}")
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()

        userEvent.keyboard("{enter}")
        expect(screen.getByRole("tooltip")).toBeInTheDocument()
    })

    it("usa o label recebido como nome do botão", () => {
        render(<InfoTooltip text={text} label="Sobre mensagens recebidas" />)

        expect(
            screen.getByRole("button", { name: "Sobre mensagens recebidas" })
        ).toBeInTheDocument()
    })
})
