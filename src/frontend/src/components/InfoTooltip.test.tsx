import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import InfoTooltip from "@/components/InfoTooltip"

const text = "Quantidade de mensagens recebidas nas últimas 24 horas."

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

        userEvent.click(button, undefined, { skipHover: true })
        expect(screen.getByRole("tooltip")).toHaveTextContent(text)

        userEvent.click(button, undefined, { skipHover: true })
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    })

    it("usa o label recebido como nome do botão", () => {
        render(<InfoTooltip text={text} label="Sobre mensagens recebidas" />)

        expect(
            screen.getByRole("button", { name: "Sobre mensagens recebidas" })
        ).toBeInTheDocument()
    })
})
