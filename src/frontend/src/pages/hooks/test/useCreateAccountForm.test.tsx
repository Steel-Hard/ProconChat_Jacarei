import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import useCreateAccountForm from "@/pages/hooks/useCreateAccountForm"
import HttpError from "@/services/http/HttpError"

const EXISTING = ["ana@exemplo.gov.br", "bruno@exemplo.gov.br"]

function renderForm(create = vi.fn(async () => {})) {
    const rendered = renderHook(() => useCreateAccountForm(EXISTING, create))

    return { ...rendered, create }
}

function fill(
    result: ReturnType<typeof renderForm>["result"],
    name: string,
    email: string,
    password: string
) {
    act(() => result.current.setName(name))
    act(() => result.current.setEmail(email))
    act(() => result.current.setPassword(password))
}

describe("useCreateAccountForm", () => {
    it("libera o envio com nome, e-mail válido e senha de 8 caracteres", () => {
        const { result } = renderForm()

        fill(result, "Carla Dias", "carla@exemplo.gov.br", "12345678")

        expect(result.current.canSubmit).toBe(true)
        expect(result.current.emailError).toBeNull()
        expect(result.current.passwordError).toBeNull()
    })

    it.each([
        ["nome vazio", "   ", "carla@exemplo.gov.br", "12345678"],
        ["e-mail inválido", "Carla", "carla@exemplo", "12345678"],
        ["senha curta", "Carla", "carla@exemplo.gov.br", "1234567"],
        ["senha acima de 72 bytes", "Carla", "carla@exemplo.gov.br", "é".repeat(37)]
    ])("bloqueia o envio com %s", (_case, name, email, password) => {
        const { result } = renderForm()

        fill(result, name, email, password)

        expect(result.current.canSubmit).toBe(false)
    })

    it("avisa o e-mail já usado na lista, aparado e sem diferenciar maiúsculas", () => {
        const { result } = renderForm()

        fill(result, "Bruno", "  BRUNO@Exemplo.gov.br ", "12345678")

        expect(result.current.emailError).toBe("Este e-mail já está em uso por outra conta.")
        expect(result.current.canSubmit).toBe(false)
    })

    it("avisa a senha curta e a senha longa demais", () => {
        const { result } = renderForm()

        act(() => result.current.setPassword("1234"))
        const short = result.current.passwordError
        act(() => result.current.setPassword("é".repeat(37)))

        expect(short).toBe("A senha deve ter no mínimo 8 caracteres.")
        expect(result.current.passwordError).toBe("A senha é longa demais.")
    })

    it("envia nome e e-mail aparados e limpa os campos depois de criar", async () => {
        const { result, create } = renderForm()
        fill(result, "  Carla Dias ", " carla@exemplo.gov.br ", "senha-inicial")

        await act(() => result.current.submit())

        expect(create).toHaveBeenCalledWith({
            name: "Carla Dias",
            email: "carla@exemplo.gov.br",
            password: "senha-inicial"
        })
        expect(result.current.name).toBe("")
        expect(result.current.email).toBe("")
        expect(result.current.password).toBe("")
    })

    it("não envia quando o formulário está inválido", async () => {
        const { result, create } = renderForm()
        fill(result, "Carla", "carla@exemplo.gov.br", "curta")

        await act(() => result.current.submit())

        expect(create).not.toHaveBeenCalled()
    })

    it("mantém os campos e mostra a mensagem do e-mail repetido no 409", async () => {
        const create = vi.fn(async () => {
            throw new HttpError(409, "x", "EMAIL_ALREADY_IN_USE")
        })
        const { result } = renderForm(create)
        fill(result, "Carla", "carla@exemplo.gov.br", "12345678")

        await act(() => result.current.submit())

        expect(result.current.error).toBe("Este e-mail já está em uso por outra conta.")
        expect(result.current.email).toBe("carla@exemplo.gov.br")
        expect(result.current.saving).toBe(false)
    })

    it("mostra a mensagem de dados inválidos no 400", async () => {
        const create = vi.fn(async () => {
            throw new HttpError(400, "x", "BAD_REQUEST")
        })
        const { result } = renderForm(create)
        fill(result, "Carla", "carla@exemplo.gov.br", "12345678")

        await act(() => result.current.submit())

        expect(result.current.error).toBe(
            "Confira os dados: nome e e-mail válidos, senha de 8 a 72 caracteres."
        )
    })

    it("não mostra mensagem no 401 e limpa o erro ao editar ou cancelar", async () => {
        let status = 401
        const create = vi.fn(async () => {
            throw new HttpError(status, "x", "X")
        })
        const { result } = renderForm(create)
        fill(result, "Carla", "carla@exemplo.gov.br", "12345678")

        await act(() => result.current.submit())
        const afterUnauthorized = result.current.error
        status = 500
        await act(() => result.current.submit())
        const afterFailure = result.current.error
        act(() => result.current.setName("Carla D"))
        const afterEdit = result.current.error
        act(() => result.current.reset())

        expect(afterUnauthorized).toBeNull()
        expect(afterFailure).toBe("Não foi possível criar a conta. Tente de novo.")
        expect(afterEdit).toBeNull()
        expect(result.current.name).toBe("")
        expect(result.current.password).toBe("")
    })

    it("não envia de novo enquanto a criação está em andamento", async () => {
        const pending = Promise.withResolvers<void>()
        const create = vi.fn(() => pending.promise)
        const { result } = renderForm(create)
        fill(result, "Carla", "carla@exemplo.gov.br", "12345678")

        let first: Promise<void> = Promise.resolve()
        act(() => {
            first = result.current.submit()
        })
        await act(() => result.current.submit())
        const savingDuringRequest = result.current.saving
        pending.resolve()
        await act(() => first)

        expect(create).toHaveBeenCalledTimes(1)
        expect(savingDuringRequest).toBe(true)
    })
})
