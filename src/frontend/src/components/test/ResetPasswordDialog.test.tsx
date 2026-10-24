import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import ResetPasswordDialog from "@/components/ResetPasswordDialog"
import useResetPasswordForm from "@/pages/hooks/useResetPasswordForm"
import HttpError from "@/services/http/HttpError"

const TEXTS = {
    title: "Redefinir senha de Bruno Lima",
    description:
        "Defina uma nova senha inicial e informe-a pessoalmente ao funcionário. A senha anterior deixa de funcionar imediatamente.",
    password: "Nova senha inicial",
    passwordPlaceholder: "Mínimo de 8 caracteres",
    confirmPassword: "Confirmar senha",
    confirm: "Redefinir senha",
    cancel: "Cancelar"
}

type HarnessProps = {
    resetPassword: (password: string) => Promise<void>
}

function Harness({ resetPassword }: HarnessProps) {
    const [open, setOpen] = useState(true)
    const form = useResetPasswordForm(async (password) => {
        await resetPassword(password)
        setOpen(false)
    })

    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Abrir
            </button>
            <ResetPasswordDialog
                open={open}
                texts={TEXTS}
                form={form}
                onCancel={() => setOpen(false)}
            />
        </>
    )
}

describe("ResetPasswordDialog", () => {
    it("mostra o título com o nome, o texto e os dois campos de senha", () => {
        render(<Harness resetPassword={vi.fn(async () => {})} />)

        const dialog = screen.getByRole("dialog", { name: "Redefinir senha de Bruno Lima" })
        expect(dialog).toHaveAccessibleDescription(TEXTS.description)
        expect(screen.getByLabelText("Nova senha inicial")).toHaveAttribute(
            "autocomplete",
            "new-password"
        )
        expect(screen.getByLabelText("Confirmar senha")).toHaveAttribute("type", "password")
        expect(screen.getByRole("button", { name: "Redefinir senha" })).toBeDisabled()
    })

    it("avisa a confirmação diferente", async () => {
        const user = userEvent.setup()
        render(<Harness resetPassword={vi.fn(async () => {})} />)

        await user.type(screen.getByLabelText("Nova senha inicial"), "senha-nova-1")
        await user.type(screen.getByLabelText("Confirmar senha"), "senha-nova-2")

        expect(screen.getByRole("alert")).toHaveTextContent("As senhas não coincidem.")
        expect(screen.getByRole("button", { name: "Redefinir senha" })).toBeDisabled()
    })

    it("redefine e fecha", async () => {
        const user = userEvent.setup()
        const resetPassword = vi.fn(async () => {})
        render(<Harness resetPassword={resetPassword} />)

        await user.type(screen.getByLabelText("Nova senha inicial"), "senha-nova-1")
        await user.type(screen.getByLabelText("Confirmar senha"), "senha-nova-1")
        await user.click(screen.getByRole("button", { name: "Redefinir senha" }))

        expect(resetPassword).toHaveBeenCalledWith("senha-nova-1")
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("continua aberta com a mensagem do código recusado", async () => {
        const user = userEvent.setup()
        const resetPassword = vi.fn(async () => {
            throw new HttpError(403, "x", "TARGET_HAS_MORE_PERMISSIONS")
        })
        render(<Harness resetPassword={resetPassword} />)

        await user.type(screen.getByLabelText("Nova senha inicial"), "senha-nova-1")
        await user.type(screen.getByLabelText("Confirmar senha"), "senha-nova-1{Enter}")

        expect(screen.getByRole("dialog")).toBeInTheDocument()
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Esta conta tem permissões que você não possui."
        )
    })

    it("limpa as senhas ao cancelar", async () => {
        const user = userEvent.setup()
        render(<Harness resetPassword={vi.fn(async () => {})} />)
        await user.type(screen.getByLabelText("Nova senha inicial"), "senha-nova-1")

        await user.click(screen.getByRole("button", { name: "Cancelar" }))
        await user.click(screen.getByRole("button", { name: "Abrir" }))

        expect(screen.getByLabelText("Nova senha inicial")).toHaveValue("")
    })
})
