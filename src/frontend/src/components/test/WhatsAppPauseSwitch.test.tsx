import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import WhatsAppPauseSwitch from "@/components/WhatsAppPauseSwitch"

describe("WhatsAppPauseSwitch", () => {
    it("expõe o estado como interruptor e chama onToggle", async () => {
        const user = userEvent.setup()
        const onToggle = vi.fn()
        render(
            <WhatsAppPauseSwitch
                label="Pausar respostas automáticas"
                stateLabel="Pausadas"
                checked
                onToggle={onToggle}
            />
        )

        await user.click(screen.getByRole("switch", { name: "Pausar respostas automáticas" }))

        expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true")
        expect(screen.getByText("Pausadas")).toBeInTheDocument()
        expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it("fica desabilitado enquanto a troca está em andamento", () => {
        render(
            <WhatsAppPauseSwitch
                label="Pausar respostas automáticas"
                stateLabel="Desligado"
                checked={false}
                disabled
                onToggle={vi.fn()}
            />
        )

        expect(screen.getByRole("switch")).toBeDisabled()
    })

    it("mantém o interruptor junto do texto por padrão", () => {
        render(
            <WhatsAppPauseSwitch
                label="Pausar"
                stateLabel="Ativas"
                checked={false}
                onToggle={vi.fn()}
            />
        )

        expect(screen.getByRole("switch").parentElement?.className).not.toMatch(/spread/)
    })

    it("leva o interruptor ao fim da linha quando pedido, com o texto ocupando o resto", () => {
        render(
            <WhatsAppPauseSwitch
                label="Avisar"
                stateLabel="Desligado"
                checked={false}
                placement="end"
                onToggle={vi.fn()}
            />
        )

        const wrapper = screen.getByRole("switch").parentElement as HTMLElement
        const text = screen.getByText("Avisar").parentElement as HTMLElement

        expect(wrapper.className).toMatch(/spread/)
        expect(text.className).toMatch(/text/)
    })
})
