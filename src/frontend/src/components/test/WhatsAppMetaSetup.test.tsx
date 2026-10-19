import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import WhatsAppMetaSetup from "@/components/WhatsAppMetaSetup"

describe("WhatsAppMetaSetup", () => {
    it("mostra os valores com Copiar, o aviso do valor ausente e os passos em ordem", async () => {
        const user = userEvent.setup()
        const onCopy = vi.fn()
        render(
            <WhatsAppMetaSetup
                heading="Configure no painel da Meta"
                copyLabel="Copiar"
                items={[
                    { label: "URL do webhook", value: null, missingText: "Sem URL pública." },
                    { label: "Token de verificação", value: "token-de-verificacao" }
                ]}
                steps={["Primeiro", "Segundo"]}
                onCopy={onCopy}
            />
        )

        await user.click(screen.getByRole("button", { name: "Copiar" }))

        expect(onCopy).toHaveBeenCalledWith("token-de-verificacao")
        expect(
            within(screen.getByRole("group", { name: "URL do webhook" })).getByText(
                "Sem URL pública."
            )
        ).toBeInTheDocument()
        expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
            "Primeiro",
            "Segundo"
        ])
    })
})
