import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import WhatsAppSecretField from "@/components/WhatsAppSecretField"

function renderField(secret: { configured: boolean; last4: string | null; value: string | null }) {
    const handlers = { onReplace: vi.fn(), onCancel: vi.fn(), onChange: vi.fn() }

    render(
        <WhatsAppSecretField
            label="App Secret"
            secret={secret}
            maskedText="••••••••9c2e"
            replaceLabel="Substituir"
            cancelLabel="Cancelar"
            placeholder="Cole o novo valor"
            storedNote="Guardado criptografado. Não é possível visualizar o valor salvo."
            {...handlers}
        />
    )

    return handlers
}

describe("WhatsAppSecretField", () => {
    it("mostra a máscara e chama onReplace em Substituir", async () => {
        const user = userEvent.setup()
        const { onReplace } = renderField({ configured: true, last4: "9c2e", value: null })

        await user.click(screen.getByRole("button", { name: "Substituir" }))

        expect(screen.getByText("••••••••9c2e")).toBeInTheDocument()
        expect(screen.queryByLabelText("App Secret", { selector: "input" })).not.toBeInTheDocument()
        expect(onReplace).toHaveBeenCalledTimes(1)
    })

    it("durante a substituição mostra o campo de senha e chama onCancel e onChange", async () => {
        const user = userEvent.setup()
        const { onCancel, onChange } = renderField({ configured: true, last4: "9c2e", value: "" })

        await user.type(screen.getByLabelText("App Secret", { selector: "input" }), "x")
        await user.click(screen.getByRole("button", { name: "Cancelar" }))

        expect(screen.queryByText("••••••••9c2e")).not.toBeInTheDocument()
        expect(onChange).toHaveBeenCalledWith("x")
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("sem segredo configurado mostra só o campo, sem Cancelar nem a nota de criptografia", () => {
        renderField({ configured: false, last4: null, value: null })

        expect(screen.getByLabelText("App Secret", { selector: "input" })).toHaveAttribute(
            "type",
            "password"
        )
        expect(screen.queryByRole("button")).not.toBeInTheDocument()
        expect(
            screen.queryByText("Guardado criptografado. Não é possível visualizar o valor salvo.")
        ).not.toBeInTheDocument()
    })
})
