import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import ContentTextField from "@/components/ContentTextField"

function renderField(length: number) {
    render(
        <ContentTextField label="Título" value={"a".repeat(length)} max={10} onChange={vi.fn()} />
    )
}

describe("ContentTextField", () => {
    it("longe do limite, o contador não é anunciado e descreve o campo", () => {
        renderField(3)

        const counter = screen.getByText("3/10")

        expect(counter).not.toHaveAttribute("aria-live")
        expect(screen.getByLabelText("Título")).toHaveAttribute("aria-describedby", counter.id)
    })

    it("perto do limite, o contador passa a ser anunciado", () => {
        renderField(9)

        expect(screen.getByText("9/10")).toHaveAttribute("aria-live", "polite")
    })

    it("acima do limite, o contador continua sendo anunciado", () => {
        renderField(11)

        expect(screen.getByText("11/10")).toHaveAttribute("aria-live", "polite")
    })
})
