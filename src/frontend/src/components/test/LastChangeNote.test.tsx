import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import LastChangeNote from "@/components/LastChangeNote"

describe("LastChangeNote", () => {
    it("mostra quem alterou e a data", () => {
        render(
            <LastChangeNote
                change={{ changedBy: "Mariana Couto", changedAt: "2026-09-15T14:30:00-03:00" }}
            />
        )

        expect(
            screen.getByText("Última alteração por Mariana Couto em 15/09/2026")
        ).toBeInTheDocument()
    })

    it("não renderiza nada sem alteração", () => {
        const { container } = render(<LastChangeNote change={null} />)

        expect(container).toBeEmptyDOMElement()
    })

    it("não renderiza nada com data inválida", () => {
        const { container } = render(
            <LastChangeNote change={{ changedBy: "Mariana Couto", changedAt: "ontem" }} />
        )

        expect(container).toBeEmptyDOMElement()
    })

    it("remove os espaços nas pontas do nome", () => {
        render(
            <LastChangeNote
                change={{ changedBy: "  Mariana Couto  ", changedAt: "2026-09-15T14:30:00-03:00" }}
            />
        )

        expect(screen.getByText(/Última alteração por/).textContent).toBe(
            "Última alteração por Mariana Couto em 15/09/2026"
        )
    })
})
