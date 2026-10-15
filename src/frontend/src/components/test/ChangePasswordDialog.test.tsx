import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ChangePasswordDialog from "@/components/ChangePasswordDialog"
import ToastProvider from "@/components/ToastProvider"

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function stubFetch(response: () => Response | Promise<Response>) {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(response()))
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
}

function Harness({ onClose }: { onClose: () => void }) {
    const [open, setOpen] = useState(true)

    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Abrir senha
            </button>
            <ChangePasswordDialog
                open={open}
                email="ana@exemplo.gov.br"
                onClose={() => {
                    onClose()
                    setOpen(false)
                }}
            />
        </>
    )
}

function renderDialog() {
    const onClose = vi.fn()
    render(
        <ToastProvider>
            <Harness onClose={onClose} />
        </ToastProvider>
    )

    return { onClose }
}

function field(name: string) {
    return screen.getByLabelText(name)
}

async function fillValid(user: ReturnType<typeof userEvent.setup>, current = "atual-123") {
    await user.type(field("Senha atual"), current)
    await user.type(field("Nova senha"), "nova-senha-123")
    await user.type(field("Confirmar senha"), "nova-senha-123")
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("ChangePasswordDialog", () => {
    it("mostra o título, o e-mail, os três campos e os botões", () => {
        renderDialog()

        expect(screen.getByRole("heading", { name: "Alterar minha senha" })).toBeInTheDocument()
        expect(
            screen.getByText("ana@exemplo.gov.br · A nova senha vale a partir do próximo acesso.")
        ).toBeInTheDocument()
        expect(field("Senha atual")).toHaveAttribute("type", "password")
        expect(field("Senha atual")).toHaveAttribute("autocomplete", "current-password")
        expect(field("Nova senha")).toHaveAttribute("type", "password")
        expect(field("Nova senha")).toHaveAttribute("autocomplete", "new-password")
        expect(field("Nova senha")).toHaveAttribute("placeholder", "Mínimo de 8 caracteres")
        expect(field("Confirmar senha")).toHaveAttribute("type", "password")
        expect(field("Confirmar senha")).toHaveAttribute("autocomplete", "new-password")
        expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar senha" })).toBeDisabled()
    })

    it("começa na senha atual e o Tab percorre os campos e os botões dentro do modal", async () => {
        const user = userEvent.setup()
        renderDialog()
        expect(field("Senha atual")).toHaveFocus()
        await fillValid(user)
        await user.click(field("Senha atual"))

        await user.tab()
        expect(field("Nova senha")).toHaveFocus()
        await user.tab()
        expect(field("Confirmar senha")).toHaveFocus()
        await user.tab()
        expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus()
        await user.tab()
        expect(screen.getByRole("button", { name: "Salvar senha" })).toHaveFocus()
        await user.tab()
        expect(field("Senha atual")).toHaveFocus()
    })

    it("envia a senha atual e a nova ao clicar em Salvar senha e fica ocupado", async () => {
        const user = userEvent.setup()
        const response = Promise.withResolvers<Response>()
        const fetchMock = stubFetch(() => response.promise)
        renderDialog()
        await fillValid(user)

        await user.click(screen.getByRole("button", { name: "Salvar senha" }))

        expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/change-password$/)
        expect(fetchMock.mock.calls[0][1]?.body).toBe(
            JSON.stringify({ currentPassword: "atual-123", newPassword: "nova-senha-123" })
        )
        expect(screen.getByRole("button", { name: "Salvar senha" })).toHaveAttribute(
            "aria-busy",
            "true"
        )
        response.resolve(jsonResponse(200, { data: { changed: true } }))
        expect(await screen.findByText("Sua senha foi alterada.")).toBeInTheDocument()
    })

    it("envia uma única vez com Enter no campo Confirmar senha", async () => {
        const user = userEvent.setup()
        const response = Promise.withResolvers<Response>()
        const fetchMock = stubFetch(() => response.promise)
        renderDialog()
        await fillValid(user)

        await user.type(field("Confirmar senha"), "{Enter}{Enter}")

        expect(fetchMock).toHaveBeenCalledTimes(1)
        response.resolve(jsonResponse(200, { data: { changed: true } }))
        expect(await screen.findByText("Sua senha foi alterada.")).toBeInTheDocument()
    })

    it("fecha e mostra o aviso de sucesso quando a senha é alterada", async () => {
        const user = userEvent.setup()
        stubFetch(() => jsonResponse(200, { data: { changed: true } }))
        const { onClose } = renderDialog()
        await fillValid(user)

        await user.click(screen.getByRole("button", { name: "Salvar senha" }))

        expect(await screen.findByText("Sua senha foi alterada.")).toBeInTheDocument()
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("continua aberto com o aviso quando a senha atual está incorreta", async () => {
        const user = userEvent.setup()
        stubFetch(() =>
            jsonResponse(400, { error: { code: "INVALID_CURRENT_PASSWORD", message: "x" } })
        )
        const { onClose } = renderDialog()
        await fillValid(user, "errada-123")

        await user.click(screen.getByRole("button", { name: "Salvar senha" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("A senha atual está incorreta.")
        expect(screen.getByRole("dialog")).toBeInTheDocument()
        expect(onClose).not.toHaveBeenCalled()
    })

    it("explica a origem não autorizada no 403 INVALID_ORIGIN", async () => {
        const user = userEvent.setup()
        stubFetch(() => jsonResponse(403, { error: { code: "INVALID_ORIGIN", message: "x" } }))
        renderDialog()
        await fillValid(user)

        await user.click(screen.getByRole("button", { name: "Salvar senha" }))

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "O painel foi aberto por um endereço não autorizado. Acesse pelo endereço oficial do painel."
        )
    })

    it("fecha sem chamar a API ao cancelar, com Esc ou clicando fora", async () => {
        const user = userEvent.setup()
        const fetchMock = stubFetch(() => jsonResponse(200, {}))
        const { onClose } = renderDialog()

        await user.click(screen.getByRole("button", { name: "Cancelar" }))
        await user.click(screen.getByRole("button", { name: "Abrir senha" }))
        await user.keyboard("{Escape}")
        await user.click(screen.getByRole("button", { name: "Abrir senha" }))
        await user.click(screen.getByRole("dialog").parentElement as HTMLElement)

        expect(onClose).toHaveBeenCalledTimes(3)
        expect(fetchMock).not.toHaveBeenCalled()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("reabre com os campos e o erro vazios", async () => {
        const user = userEvent.setup()
        renderDialog()
        await user.type(field("Senha atual"), "atual-123")
        await user.type(field("Nova senha"), "curta")
        expect(screen.getByRole("alert")).toHaveTextContent(
            "A senha deve ter no mínimo 8 caracteres."
        )

        await user.click(screen.getByRole("button", { name: "Cancelar" }))
        await user.click(screen.getByRole("button", { name: "Abrir senha" }))

        expect(field("Senha atual")).toHaveValue("")
        expect(field("Nova senha")).toHaveValue("")
        expect(field("Confirmar senha")).toHaveValue("")
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
})
