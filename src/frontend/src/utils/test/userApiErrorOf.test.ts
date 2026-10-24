import { describe, expect, it } from "vitest"
import HttpError from "@/services/http/HttpError"
import userApiErrorOf from "@/utils/userApiErrorOf"
import type UserErrorCode from "@/types/users/UserErrorCode.types"

function apiError(status: number, code: string, details?: Record<string, unknown>) {
    return { status, data: { error: { code, message: "mensagem do servidor", details } } }
}

const CODES: Array<[number, UserErrorCode]> = [
    [409, "EMAIL_ALREADY_IN_USE"],
    [403, "SELF_ACCOUNT_LOCKED"],
    [403, "TARGET_HAS_MORE_PERMISSIONS"],
    [403, "PERMISSION_NOT_HELD"],
    [403, "ADMIN_ACCOUNT_LOCKED"],
    [404, "NOT_FOUND"],
    [409, "REASSIGNMENT_REQUIRED"],
    [409, "INVALID_REASSIGNMENT_TARGET"],
    [409, "REASSIGNMENT_TARGET_BUSY"]
]

describe("userApiErrorOf", () => {
    it.each(CODES)("usa a mensagem própria no %i %s", (status, code) => {
        expect(userApiErrorOf(apiError(status, code), "save")).toEqual({
            key: `errors.codes.${code}`,
            code
        })
    })

    it("extrai a conta de details.userId", () => {
        const error = apiError(403, "PERMISSION_NOT_HELD", { userId: 7 })

        expect(userApiErrorOf(error, "save")).toEqual({
            key: "errors.codes.PERMISSION_NOT_HELD",
            code: "PERMISSION_NOT_HELD",
            userId: 7
        })
    })

    it("extrai o protocolo e o protocolo em conflito do REASSIGNMENT_TARGET_BUSY", () => {
        const error = apiError(409, "REASSIGNMENT_TARGET_BUSY", {
            userId: 9,
            toUserId: 7,
            protocol: "AB12CD34",
            conflictingProtocol: "EF56GH78"
        })

        expect(userApiErrorOf(error, "save")).toEqual({
            key: "errors.codes.REASSIGNMENT_TARGET_BUSY",
            code: "REASSIGNMENT_TARGET_BUSY",
            userId: 9,
            values: { protocol: "AB12CD34", conflictingProtocol: "EF56GH78" }
        })
    })

    it("ignora details com tipos inesperados", () => {
        const error = apiError(409, "REASSIGNMENT_TARGET_BUSY", {
            userId: "9",
            protocol: 12
        })

        expect(userApiErrorOf(error, "save")).toEqual({
            key: "errors.codes.REASSIGNMENT_TARGET_BUSY",
            code: "REASSIGNMENT_TARGET_BUSY"
        })
    })

    it("não devolve nada no 401", () => {
        expect(userApiErrorOf(apiError(401, "UNAUTHORIZED"), "save")).toBeNull()
    })

    it("usa a mensagem de origem inválida no 403 INVALID_ORIGIN", () => {
        expect(userApiErrorOf(apiError(403, "INVALID_ORIGIN"), "create")).toEqual({
            key: "common:errors.invalidOrigin",
            code: null
        })
    })

    it("usa a mensagem de permissão perdida no 403 FORBIDDEN", () => {
        expect(userApiErrorOf(apiError(403, "FORBIDDEN"), "save")).toEqual({
            key: "errors.forbidden",
            code: null
        })
    })

    it.each(["create", "reset", "save"] as const)(
        "usa a mensagem de dados inválidos de %s no 400",
        (action) => {
            expect(userApiErrorOf(apiError(400, "BAD_REQUEST"), action)).toEqual({
                key: `errors.badRequest.${action}`,
                code: null
            })
        }
    )

    it("usa a mensagem genérica da ação no 400 de leitura", () => {
        expect(userApiErrorOf(apiError(400, "BAD_REQUEST"), "future")).toEqual({
            key: "errors.failed.future",
            code: null
        })
    })

    it("usa a mensagem genérica da ação num code desconhecido", () => {
        expect(userApiErrorOf(apiError(500, "INTERNAL_ERROR"), "load")).toEqual({
            key: "errors.failed.load",
            code: null
        })
    })

    it("usa a mensagem genérica da ação quando o corpo não tem o envelope de erro", () => {
        expect(userApiErrorOf({ status: 409, data: null }, "save")).toEqual({
            key: "errors.failed.save",
            code: null
        })
    })

    it("usa a mensagem genérica da ação no erro de rede, no erro serializado e sem erro", () => {
        expect(
            userApiErrorOf({ status: "FETCH_ERROR", error: "TypeError: Failed to fetch" }, "reset")
        ).toEqual({ key: "errors.failed.reset", code: null })
        expect(userApiErrorOf({ message: "falhou" }, "create")).toEqual({
            key: "errors.failed.create",
            code: null
        })
        expect(userApiErrorOf(undefined, "save")).toEqual({ key: "errors.failed.save", code: null })
    })

    it("lê o status e o code de um HttpError", () => {
        expect(userApiErrorOf(new HttpError(409, "x", "EMAIL_ALREADY_IN_USE"), "create")).toEqual({
            key: "errors.codes.EMAIL_ALREADY_IN_USE",
            code: "EMAIL_ALREADY_IN_USE"
        })
        expect(userApiErrorOf(new HttpError(403, "x", "INVALID_ORIGIN"), "reset")).toEqual({
            key: "common:errors.invalidOrigin",
            code: null
        })
        expect(userApiErrorOf(new HttpError(400, "x", "BAD_REQUEST"), "reset")).toEqual({
            key: "errors.badRequest.reset",
            code: null
        })
    })

    it("não devolve nada num HttpError 401", () => {
        expect(userApiErrorOf(new HttpError(401, "x", "UNAUTHORIZED"), "create")).toBeNull()
    })

    it("usa a mensagem genérica da ação num erro que não veio da API", () => {
        expect(userApiErrorOf(new Error("falhou"), "create")).toEqual({
            key: "errors.failed.create",
            code: null
        })
    })
})
