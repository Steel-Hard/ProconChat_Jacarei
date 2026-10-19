import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import WhatsAppMessageBubble from "@/components/WhatsAppMessageBubble"

describe("WhatsAppMessageBubble", () => {
    it("mostra o texto da mensagem e o horário ao lado", () => {
        render(<WhatsAppMessageBubble text="Atendimento indisponível." time="10:15" />)

        expect(screen.getByText("Atendimento indisponível.")).toBeInTheDocument()
        expect(screen.getByText("10:15")).toBeInTheDocument()
    })
})
