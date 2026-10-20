import { describe, expect, it } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import { validateSchema } from "../middleware/validateRequest.middleware"
import {
    accountBatchBodySchema,
    createAccountBodySchema,
    resetPasswordBodySchema,
    userIdParamSchema,
} from "./userAccount.schema"

function batchOf(changes: unknown[]) {
    return { changes }
}

describe("userAccount.schema", () => {
    describe("userIdParamSchema", () => {
        it("aceita um id inteiro positivo e o devolve como numero", () => {
            const parsed = validateSchema(userIdParamSchema, { id: "7" })

            expect(parsed).toEqual({ id: 7 })
        })

        it.each(["0", "-1", "abc", "1.5", "", "99999999999999999999"])("recusa o id %s", (id) => {
            expect(() => validateSchema(userIdParamSchema, { id })).toThrow(BadRequestError)
        })
    })

    describe("createAccountBodySchema", () => {
        it("apara nome e e-mail e descarta permissions e isAdmin", () => {
            const parsed = validateSchema(createAccountBodySchema, {
                name: "  Lucas Andrade ",
                email: " Lucas.Andrade@Exemplo.test ",
                password: "senha-segura",
                permissions: ["users.manage"],
                isAdmin: true,
            })

            expect(parsed).toEqual({
                name: "Lucas Andrade",
                email: "Lucas.Andrade@Exemplo.test",
                password: "senha-segura",
            })
        })

        it("recusa nome vazio depois de aparado", () => {
            expect(() =>
                validateSchema(createAccountBodySchema, { name: "   ", email: "a@exemplo.test", password: "senha-segura" }),
            ).toThrow(BadRequestError)
        })

        it("recusa nome com mais de 150 caracteres e aceita 150", () => {
            const base = { email: "a@exemplo.test", password: "senha-segura" }

            expect(() => validateSchema(createAccountBodySchema, { ...base, name: "n".repeat(151) })).toThrow(BadRequestError)
            expect(validateSchema(createAccountBodySchema, { ...base, name: "n".repeat(150) }).name).toHaveLength(150)
        })

        it("recusa e-mail invalido ou com mais de 150 caracteres", () => {
            const base = { name: "Pessoa", password: "senha-segura" }
            const longEmail = `${"a".repeat(140)}@exemplo.test`

            expect(() => validateSchema(createAccountBodySchema, { ...base, email: "sem-arroba" })).toThrow(BadRequestError)
            expect(() => validateSchema(createAccountBodySchema, { ...base, email: longEmail })).toThrow(BadRequestError)
        })

        it("recusa senha que nao e texto", () => {
            expect(() =>
                validateSchema(createAccountBodySchema, { name: "Pessoa", email: "a@exemplo.test", password: 12345678 }),
            ).toThrow(BadRequestError)
        })
    })

    describe("resetPasswordBodySchema", () => {
        it("aceita a senha como texto e recusa a ausencia dela", () => {
            expect(validateSchema(resetPasswordBodySchema, { password: "nova-senha" })).toEqual({ password: "nova-senha" })
            expect(() => validateSchema(resetPasswordBodySchema, {})).toThrow(BadRequestError)
        })
    })

    describe("accountBatchBodySchema", () => {
        it("aceita itens com permissions, active e os dois modos de reassignment", () => {
            const body = batchOf([
                { userId: 7, permissions: ["appointments.view", "appointments.manage"] },
                { userId: 9, active: false, reassignment: { mode: "assign", toUserId: 7 } },
                { userId: 12, permissions: [], reassignment: { mode: "pending" } },
            ])

            expect(validateSchema(accountBatchBodySchema, body)).toEqual(body)
        })

        it("recusa changes vazio", () => {
            expect(() => validateSchema(accountBatchBodySchema, batchOf([]))).toThrow(BadRequestError)
        })

        it("aceita 100 itens e recusa 101", () => {
            const changes = (n: number) => Array.from({ length: n }, (_, index) => ({ userId: index + 1, active: true }))

            expect(validateSchema(accountBatchBodySchema, batchOf(changes(100))).changes).toHaveLength(100)
            expect(() => validateSchema(accountBatchBodySchema, batchOf(changes(101)))).toThrow(BadRequestError)
        })

        it("recusa userId repetido no lote", () => {
            const body = batchOf([
                { userId: 7, active: true },
                { userId: 7, permissions: [] },
            ])

            expect(() => validateSchema(accountBatchBodySchema, body)).toThrow(BadRequestError)
        })

        it("recusa item sem permissions e sem active, inclusive so com reassignment", () => {
            expect(() => validateSchema(accountBatchBodySchema, batchOf([{ userId: 7 }]))).toThrow(BadRequestError)
            expect(() =>
                validateSchema(accountBatchBodySchema, batchOf([{ userId: 7, reassignment: { mode: "pending" } }])),
            ).toThrow(BadRequestError)
        })

        it("recusa chave de permissao fora das 8 ou repetida", () => {
            expect(() =>
                validateSchema(accountBatchBodySchema, batchOf([{ userId: 7, permissions: ["admin.only"] }])),
            ).toThrow(BadRequestError)
            expect(() =>
                validateSchema(
                    accountBatchBodySchema,
                    batchOf([{ userId: 7, permissions: ["sessions.view", "sessions.view"] }]),
                ),
            ).toThrow(BadRequestError)
        })

        it.each([0, -3, 1.5, "7"])("recusa userId %s", (userId) => {
            expect(() => validateSchema(accountBatchBodySchema, batchOf([{ userId, active: true }]))).toThrow(
                BadRequestError,
            )
        })

        it("recusa reassignment com modo desconhecido ou assign sem toUserId valido", () => {
            const withReassignment = (reassignment: unknown) => batchOf([{ userId: 7, active: false, reassignment }])

            expect(() => validateSchema(accountBatchBodySchema, withReassignment({ mode: "delete" }))).toThrow(
                BadRequestError,
            )
            expect(() => validateSchema(accountBatchBodySchema, withReassignment({ mode: "assign" }))).toThrow(
                BadRequestError,
            )
            expect(() =>
                validateSchema(accountBatchBodySchema, withReassignment({ mode: "assign", toUserId: 0 })),
            ).toThrow(BadRequestError)
        })
    })
})
