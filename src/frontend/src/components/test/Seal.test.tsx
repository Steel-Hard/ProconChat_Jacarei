import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import Seal from "@/components/Seal"

vi.setConfig({ testTimeout: 20000 })

describe("Seal", () => {
    it("mostra o texto do selo neutro", () => {
        render(<Seal label="Por representante" />)

        expect(screen.getByText("Por representante")).toBeInTheDocument()
    })

    it("marca o tom informativo do selo", () => {
        render(<Seal label="Remarcado pelo cidadão" tone="info" />)

        expect(screen.getByText("Remarcado pelo cidadão")).toHaveAttribute("data-tone", "info")
    })

    it("mostra o texto do selo de alerta", () => {
        render(<Seal label="Fora da grade atual" tone="warning" />)

        expect(screen.getByText("Fora da grade atual")).toBeInTheDocument()
    })
})
