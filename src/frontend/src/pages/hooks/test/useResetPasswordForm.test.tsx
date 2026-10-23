import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import useResetPasswordForm from "@/pages/hooks/useResetPasswordForm"
import HttpError from "@/services/http/HttpError"

function renderForm(reset = vi.fn(async () => {})) {
    const rendered = renderHook(() => useResetPasswordForm(reset))

    return { ...rendered, resetPassword: reset }
}

function fill(result: ReturnType<typeof renderForm>["result"], password: string, confirm: string) {
    act(() => result.current.setPassword(password))
    act(() => result.current.setConfirmPassword(confirm))
}

describe("useResetPasswordForm", () => {
    it("libera o envio com a senha de 8 caracteres confirmada", () => {
        const { result } = renderForm()

        fill(result, "senha-nova-1", "senha-nova-1")

        expect(result.current.canSubmit).toBe(true)
        expect(result.current.error).toBeNull()
    })

    it.each([
        ["curta", "1234567", "1234567", "A senha deve ter no mínimo 8 caracteres."],
        ["longa demais", "é".repeat(37), "é".repeat(37), "A senha é longa demais."],
        ["com confirmação diferente", "senha-nova-1", "senha-nova-2", "As senhas não coincidem."]
    ])("bloqueia a senha %s com o aviso", (_case, password, confirm, message) => {
        const { result } = renderForm()

        fill(result, password, confirm)

        expect(result.current.canSubmit).toBe(false)
        expect(result.current.error).toBe(message)
    })

    it("envia só a senha e limpa os campos depois de redefinir", async () => {
        const { result, resetPassword } = renderForm()
        fill(result, "senha-nova-1", "senha-nova-1")

        await act(() => result.current.submit())

        expect(resetPassword).toHaveBeenCalledWith("senha-nova-1")
        expect(result.current.password).toBe("")
        expect(result.current.confirmPassword).toBe("")
    })

    it("não envia quando o formulário está inválido", async () => {
        const { result, resetPassword } = renderForm()
        fill(result, "senha-nova-1", "")

        await act(() => result.current.submit())

        expect(resetPassword).not.toHaveBeenCalled()
    })

    it.each([
        [
            403,
            "SELF_ACCOUNT_LOCKED",
            "Você não pode alterar a própria conta. Peça a outro usuário com a permissão Gerenciar usuários."
        ],
        [403, "ADMIN_ACCOUNT_LOCKED", "A conta Admin não pode ser alterada pelo painel."],
        [403, "TARGET_HAS_MORE_PERMISSIONS", "Esta conta tem permissões que você não possui."],
        [404, "NOT_FOUND", "A conta não foi encontrada. Recarregue a página."],
        [400, "BAD_REQUEST", "A nova senha não foi aceita. Use de 8 a 72 caracteres."]
    ])("mantém a janela com a mensagem do %i %s", async (status, code, message) => {
        const resetPassword = vi.fn(async () => {
            throw new HttpError(status, "x", code)
        })
        const { result } = renderForm(resetPassword)
        fill(result, "senha-nova-1", "senha-nova-1")

        await act(() => result.current.submit())

        expect(result.current.error).toBe(message)
        expect(result.current.password).toBe("senha-nova-1")
    })

    it("não mostra mensagem no 401 e limpa tudo ao cancelar", async () => {
        const resetPassword = vi.fn(async () => {
            throw new HttpError(401, "x", "UNAUTHORIZED")
        })
        const { result } = renderForm(resetPassword)
        fill(result, "senha-nova-1", "senha-nova-1")

        await act(() => result.current.submit())
        const afterUnauthorized = result.current.error
        act(() => result.current.reset())

        expect(afterUnauthorized).toBeNull()
        expect(result.current.password).toBe("")
        expect(result.current.confirmPassword).toBe("")
    })

    it("não envia de novo enquanto a redefinição está em andamento", async () => {
        const pending = Promise.withResolvers<void>()
        const resetPassword = vi.fn(() => pending.promise)
        const { result } = renderForm(resetPassword)
        fill(result, "senha-nova-1", "senha-nova-1")

        let first: Promise<void> = Promise.resolve()
        act(() => {
            first = result.current.submit()
        })
        await act(() => result.current.submit())
        pending.resolve()
        await act(() => first)

        expect(resetPassword).toHaveBeenCalledTimes(1)
    })
})
