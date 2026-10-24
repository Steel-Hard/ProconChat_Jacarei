import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import CreateAccountDialog from "@/components/CreateAccountDialog"
import useCreateAccountForm from "@/pages/hooks/useCreateAccountForm"
import HttpError from "@/services/http/HttpError"
import type CreateAccountInput from "@/types/users/CreateAccountInput.types"

const TEXTS = {
    title: "Criar conta",
    name: "Nome",
    email: "E-mail",
    emailPlaceholder: "nome@jacarei.sp.gov.br",
    password: "Senha inicial",
    passwordPlaceholder: "Mínimo de 8 caracteres",
    note: "Informe a senha inicial diretamente ao funcionário. A conta é criada sem permissões.",
    confirm: "Criar conta",
    cancel: "Cancelar"
}

type HarnessProps = {
    create: (input: CreateAccountInput) => Promise<void>
}

function Harness({ create }: HarnessProps) {
    const [open, setOpen] = useState(true)
    const form = useCreateAccountForm(["bruno@exemplo.gov.br"], async (input) => {
        await create(input)
        setOpen(false)
    })

    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Abrir
            </button>
            <CreateAccountDialog
                open={open}
                texts={TEXTS}
                form={form}
                onCancel={() => setOpen(false)}
            />
        </>
    )
}

function confirmButton() {
    return screen.getAllByRole("button", { name: "Criar conta" }).at(-1) as HTMLElement
}

describe("CreateAccountDialog", () => {
    it("mostra os campos, os exemplos e a nota", () => {
        render(<Harness create={vi.fn(async () => {})} />)

        expect(screen.getByRole("dialog", { name: "Criar conta" })).toBeInTheDocument()
        expect(screen.getByRole("textbox", { name: "Nome" })).toBeInTheDocument()
        expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveAttribute(
            "placeholder",
            "nome@jacarei.sp.gov.br"
        )
        expect(screen.getByLabelText("Senha inicial")).toHaveAttribute(
            "placeholder",
            "Mínimo de 8 caracteres"
        )
        expect(screen.getByLabelText("Senha inicial")).toHaveAttribute("type", "password")
        expect(
            screen.getByText(
                "Informe a senha inicial diretamente ao funcionário. A conta é criada sem permissões."
            )
        ).toBeInTheDocument()
        expect(confirmButton()).toBeDisabled()
    })

    it("avisa o e-mail repetido e a senha curta, mantendo Criar conta desabilitado", async () => {
        const user = userEvent.setup()
        render(<Harness create={vi.fn(async () => {})} />)

        await user.type(screen.getByRole("textbox", { name: "Nome" }), "Bruno")
        await user.type(screen.getByRole("textbox", { name: "E-mail" }), "Bruno@exemplo.gov.br")
        await user.type(screen.getByLabelText("Senha inicial"), "123")

        expect(screen.getByText("Este e-mail já está em uso por outra conta.")).toBeInTheDocument()
        expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveAccessibleDescription(
            "Este e-mail já está em uso por outra conta."
        )
        expect(screen.getByText("A senha deve ter no mínimo 8 caracteres.")).toBeInTheDocument()
        expect(confirmButton()).toBeDisabled()
    })

    it("envia com Enter e fecha depois de criar", async () => {
        const user = userEvent.setup()
        const create = vi.fn(async () => {})
        render(<Harness create={create} />)

        await user.type(screen.getByRole("textbox", { name: "Nome" }), "Carla Dias")
        await user.type(screen.getByRole("textbox", { name: "E-mail" }), "carla@exemplo.gov.br")
        await user.type(screen.getByLabelText("Senha inicial"), "senha-inicial{Enter}")

        expect(create).toHaveBeenCalledWith({
            name: "Carla Dias",
            email: "carla@exemplo.gov.br",
            password: "senha-inicial"
        })
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("continua aberta com a mensagem do 409", async () => {
        const user = userEvent.setup()
        const create = vi.fn(async () => {
            throw new HttpError(409, "x", "EMAIL_ALREADY_IN_USE")
        })
        render(<Harness create={create} />)

        await user.type(screen.getByRole("textbox", { name: "Nome" }), "Carla Dias")
        await user.type(screen.getByRole("textbox", { name: "E-mail" }), "carla@exemplo.gov.br")
        await user.type(screen.getByLabelText("Senha inicial"), "senha-inicial")
        await user.click(confirmButton())

        expect(screen.getByRole("dialog", { name: "Criar conta" })).toBeInTheDocument()
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Este e-mail já está em uso por outra conta."
        )
    })

    it("limpa os campos ao cancelar", async () => {
        const user = userEvent.setup()
        render(<Harness create={vi.fn(async () => {})} />)
        await user.type(screen.getByRole("textbox", { name: "Nome" }), "Carla")
        await user.type(screen.getByLabelText("Senha inicial"), "senha-inicial")

        await user.click(screen.getByRole("button", { name: "Cancelar" }))
        await user.click(screen.getByRole("button", { name: "Abrir" }))

        expect(screen.getByRole("textbox", { name: "Nome" })).toHaveValue("")
        expect(screen.getByLabelText("Senha inicial")).toHaveValue("")
    })
})
