import { screen } from "@testing-library/react"
import { expect } from "vitest"

async function settleSchedulePage(unmount: () => void): Promise<void> {
    expect(await screen.findByRole("heading", { name: "Grade semanal" })).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: "Próximo mês" })).toBeInTheDocument()
    unmount()
    await new Promise((resolve) => setTimeout(resolve, 20))
}

export default settleSchedulePage
