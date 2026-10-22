import { describe, expect, it, vi } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import ForbiddenError from "../errors/ForbiddenError"
import NotFoundError from "../errors/NotFoundError"
import { UserAccountRepositoryStub } from "../repositories/mock/userAccountStub.repository"
import type { UserAccount } from "../types/userAccount.types"
import type { PasswordHasher } from "../utils/passwordHasher"
import { createUserAccountService } from "./userAccount.service"
import { decideAccountBatch, decidePasswordReset } from "./userAccountRules"

const NOW = new Date("2031-01-10T12:00:00.000Z")
const REQUESTER = { id: 1, isAdmin: false, permissions: ["users.manage" as const] }

const hasher: PasswordHasher = {
    hash: vi.fn(async (password: string) => `hash(${password})`),
    compare: vi.fn(async () => false),
}

function account(id: number, overrides: Partial<UserAccount> = {}): UserAccount {
    return {
        id,
        name: `Conta ${id}`,
        email: `conta${id}@exemplo.test`,
        isAdmin: false,
        active: true,
        permissions: [],
        lastLoginAt: null,
        permissionsUpdatedAt: null,
        permissionsUpdatedBy: null,
        ...overrides,
    }
}

function setup(repository = new UserAccountRepositoryStub({ accounts: [account(1), account(5), account(9)] })) {
    return { repository, service: createUserAccountService({ repository, hasher, now: () => NOW }) }
}

describe("userAccount.service", () => {
    it("cria a conta com o e-mail aparado em minusculas e o hash no lugar da senha", async () => {
        const { repository, service } = setup()

        await service.createAccount({ name: "Lucas Andrade", email: "  Lucas.Andrade@Exemplo.TEST ", password: "senha-segura" })

        expect(repository.createCalls).toEqual([
            { name: "Lucas Andrade", email: "lucas.andrade@exemplo.test", passwordHash: "hash(senha-segura)" },
        ])
    })

    it.each([
        ["curta", "Password must contain at least 8 characters"],
        ["é".repeat(37), "Password must not exceed 72 bytes"],
    ])("recusa a senha %s na criacao sem chamar o repositorio", async (password, message) => {
        const { repository, service } = setup()

        const attempt = service.createAccount({ name: "Pessoa", email: "p@exemplo.test", password })

        await expect(attempt).rejects.toEqual(new BadRequestError(message))
        expect(repository.createCalls).toEqual([])
    })

    it("repassa sem mudanca o erro do repositorio", async () => {
        const { service } = setup(new UserAccountRepositoryStub({ takenEmails: ["p@exemplo.test"] }))

        await expect(service.createAccount({ name: "Pessoa", email: "P@exemplo.test", password: "senha-segura" })).rejects.toMatchObject({
            code: "EMAIL_ALREADY_IN_USE",
        })
    })

    it("envia os itens do lote em ordem de userId com o instante de now e a regra decideAccountBatch", async () => {
        const repository = new UserAccountRepositoryStub({ accounts: [account(1), account(5), account(9)] })
        const apply = vi.spyOn(repository, "applyAccountBatch")
        const { service } = setup(repository)

        await service.saveBatch(REQUESTER, [
            { userId: 9, active: false },
            { userId: 5, active: false },
        ])

        expect(apply).toHaveBeenCalledWith(
            {
                requester: REQUESTER,
                changes: [
                    { userId: 5, active: false },
                    { userId: 9, active: false },
                ],
                now: NOW,
            },
            decideAccountBatch,
        )
    })

    it("propaga o erro das regras do lote", async () => {
        const { service } = setup()

        const attempt = service.saveBatch(REQUESTER, [{ userId: 1, active: false }])

        await expect(attempt).rejects.toBeInstanceOf(ForbiddenError)
        await expect(attempt).rejects.toMatchObject({ code: "SELF_ACCOUNT_LOCKED", details: { userId: 1 } })
    })

    it("redefine a senha com o hash e a regra decidePasswordReset", async () => {
        const repository = new UserAccountRepositoryStub({ accounts: [account(1), account(5)] })
        const reset = vi.spyOn(repository, "resetPassword")
        const { service } = setup(repository)

        await service.resetPassword(REQUESTER, 5, "nova-senha-segura")

        expect(reset).toHaveBeenCalledWith(
            { requester: REQUESTER, userId: 5, passwordHash: "hash(nova-senha-segura)" },
            decidePasswordReset,
        )
    })

    it("recusa a senha invalida na redefinicao sem chamar o repositorio", async () => {
        const { repository, service } = setup()

        await expect(service.resetPassword(REQUESTER, 5, "curta")).rejects.toBeInstanceOf(BadRequestError)
        expect(repository.resetCalls).toEqual([])
    })

    it("lista os agendamentos futuros com o instante de now", async () => {
        const future = [
            { id: "50", protocol: "P0000050", name: "Titular", appointmentDatetime: "2031-02-01T13:00:00.000Z", status: "CONFIRMED" as const },
        ]
        const repository = new UserAccountRepositoryStub({ accounts: [account(5)], futureAppointments: { 5: future } })
        const { service } = setup(repository)

        const result = await service.listFutureAppointments(5)

        expect(result).toEqual(future)
        expect(repository.futureCalls).toEqual([{ userId: 5, now: NOW }])
    })

    it("responde 404 nos agendamentos futuros de conta inexistente", async () => {
        const { service } = setup()

        await expect(service.listFutureAppointments(42)).rejects.toBeInstanceOf(NotFoundError)
    })
})
