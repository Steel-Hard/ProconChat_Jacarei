import { afterEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import useChangePasswordForm from "@/hooks/useChangePasswordForm"

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function renderForm() {
    const onDone = vi.fn()
    const rendered = renderHook(() => useChangePasswordForm(onDone))

    return { ...rendered, onDone }
}

function fill(
    result: ReturnType<typeof renderForm>["result"],
    current: string,
    next: string,
    confirm: string
) {
    act(() => result.current.setCurrentPassword(current))
    act(() => result.current.setNewPassword(next))
    act(() => result.current.setConfirmPassword(confirm))
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("useChangePasswordForm", () => {
    it("avisa quando a nova senha tem menos de 8 caracteres", () => {
        const { result } = renderForm()

        fill(result, "atual-123", "curta", "")

        expect(result.current.error).toBe("A senha deve ter no mínimo 8 caracteres.")
        expect(result.current.canSave).toBe(false)
    })

    it("avisa quando a confirmação é diferente da nova senha", () => {
        const { result } = renderForm()

        fill(result, "atual-123", "nova-senha-123", "nova-senha-124")

        expect(result.current.error).toBe("As senhas não coincidem.")
        expect(result.current.canSave).toBe(false)
    })

    it("avisa quando a nova senha passa de 72 bytes, contando acentos", () => {
        const { result } = renderForm()
        const accented = "é".repeat(37)

        fill(result, "atual-123", accented, accented)

        expect(accented.length).toBeLessThan(72)
        expect(result.current.error).toBe("A senha é longa demais.")
        expect(result.current.canSave).toBe(false)
    })

    it("não deixa salvar sem a senha atual", () => {
        const { result } = renderForm()

        fill(result, "", "nova-senha-123", "nova-senha-123")

        expect(result.current.error).toBeNull()
        expect(result.current.canSave).toBe(false)
    })

    it("mostra senha atual incorreta no 400 INVALID_CURRENT_PASSWORD", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                jsonResponse(400, { error: { code: "INVALID_CURRENT_PASSWORD", message: "x" } })
            )
        )
        const { result, onDone } = renderForm()
        fill(result, "errada-123", "nova-senha-123", "nova-senha-123")

        await act(async () => {
            await result.current.submit()
        })

        expect(result.current.error).toBe("A senha atual está incorreta.")
        expect(result.current.saving).toBe(false)
        expect(onDone).not.toHaveBeenCalled()
    })

    it("mostra senha recusada no 400 com outro código", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => jsonResponse(400, { error: { code: "BAD_REQUEST", message: "x" } }))
        )
        const { result } = renderForm()
        fill(result, "atual-123", "nova-senha-123", "nova-senha-123")

        await act(async () => {
            await result.current.submit()
        })

        expect(result.current.error).toBe("A nova senha não foi aceita. Use de 8 a 72 caracteres.")
    })

    it.each([
        ["rede", () => Promise.reject(new TypeError("Failed to fetch"))],
        ["500", async () => jsonResponse(500, { error: { code: "INTERNAL", message: "x" } })]
    ])("mostra a falha genérica quando falha por %s", async (_label, response) => {
        vi.stubGlobal("fetch", vi.fn(response))
        const { result } = renderForm()
        fill(result, "atual-123", "nova-senha-123", "nova-senha-123")

        await act(async () => {
            await result.current.submit()
        })

        expect(result.current.error).toBe("Não foi possível alterar a senha agora. Tente de novo.")
    })

    it("limpa os campos e o erro no reset", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                jsonResponse(400, { error: { code: "INVALID_CURRENT_PASSWORD", message: "x" } })
            )
        )
        const { result } = renderForm()
        fill(result, "errada-123", "nova-senha-123", "nova-senha-123")
        await act(async () => {
            await result.current.submit()
        })

        act(() => result.current.reset())

        expect(result.current.currentPassword).toBe("")
        expect(result.current.newPassword).toBe("")
        expect(result.current.confirmPassword).toBe("")
        expect(result.current.error).toBeNull()
    })

    it("faz uma única requisição quando o envio é acionado duas vezes seguidas", async () => {
        const response = Promise.withResolvers<Response>()
        const fetchMock = vi.fn(() => response.promise)
        vi.stubGlobal("fetch", fetchMock)
        const { result } = renderForm()
        fill(result, "atual-123", "nova-senha-123", "nova-senha-123")

        let first: Promise<void> = Promise.resolve()
        let second: Promise<void> = Promise.resolve()
        act(() => {
            first = result.current.submit()
            second = result.current.submit()
        })
        await act(async () => {
            response.resolve(jsonResponse(200, { data: { changed: true } }))
            await Promise.all([first, second])
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
    })
})
