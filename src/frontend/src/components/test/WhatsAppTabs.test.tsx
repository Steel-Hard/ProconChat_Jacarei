import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import WhatsAppTabs from "@/components/WhatsAppTabs"

const TABS = [
    { id: "connection", label: "Conexão" },
    { id: "privacy", label: "Privacidade" }
]

function Harness() {
    const [selected, setSelected] = useState("connection")

    return (
        <WhatsAppTabs label="Seções" tabs={TABS} selected={selected} onSelect={setSelected}>
            <p>{selected}</p>
        </WhatsAppTabs>
    )
}

describe("WhatsAppTabs", () => {
    it("mostra as abas Conexão e Privacidade com Conexão selecionada", () => {
        render(<Harness />)

        expect(screen.getByRole("tab", { name: "Conexão" })).toHaveAttribute(
            "aria-selected",
            "true"
        )
        expect(screen.getByRole("tab", { name: "Privacidade" })).toHaveAttribute(
            "aria-selected",
            "false"
        )
        expect(screen.getByRole("tabpanel", { name: "Conexão" })).toHaveTextContent("connection")
    })

    it("a seta para a direita move o foco e a seleção para a próxima aba", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.click(screen.getByRole("tab", { name: "Conexão" }))
        await user.keyboard("{ArrowRight}")

        const privacy = screen.getByRole("tab", { name: "Privacidade" })
        expect(privacy).toHaveFocus()
        expect(privacy).toHaveAttribute("aria-selected", "true")
        expect(screen.getByRole("tabpanel", { name: "Privacidade" })).toHaveTextContent("privacy")
    })
})
