import { describe, expect, it } from "vitest"
import { validateSchema } from "../middleware/validateRequest.middleware"
import {
    appointmentIdParamSchema,
    listAppointmentsQuerySchema,
    updateStatusBodySchema,
} from "./appointment.schema"

describe("appointment.schema", () => {
    describe("listAppointmentsQuerySchema", () => {
        it("aplica valores padrão para status, period, page e limit", () => {
            const parsed = validateSchema(listAppointmentsQuerySchema, {})
            expect(parsed.status).toBe("all")
            expect(parsed.period).toBe("upcoming")
            expect(parsed.responsible).toBe("all")
            expect(parsed.page).toBe(1)
            expect(parsed.limit).toBe(20)
        })

        it("valida query com parâmetros completos", () => {
            const parsed = validateSchema(listAppointmentsQuerySchema, {
                search: "Maria",
                status: "PENDING",
                period: "today",
                responsible: "2",
                sortBy: "appointment_datetime",
                sortOrder: "desc",
                page: "2",
                limit: "15",
            })
            expect(parsed.search).toBe("Maria")
            expect(parsed.status).toBe("PENDING")
            expect(parsed.period).toBe("today")
            expect(parsed.responsible).toBe("2")
            expect(parsed.sortBy).toBe("appointment_datetime")
            expect(parsed.sortOrder).toBe("desc")
            expect(parsed.page).toBe(2)
            expect(parsed.limit).toBe(15)
        })

        it("rejeita busca com menos de 2 caracteres", () => {
            expect(() =>
                validateSchema(listAppointmentsQuerySchema, { search: "a" }),
            ).toThrow("Busca deve ter no mínimo 2 caracteres")
            expect(() =>
                validateSchema(listAppointmentsQuerySchema, { search: "_" }),
            ).toThrow("Busca deve ter no mínimo 2 caracteres")
        })

        it("aceita busca vazia ou omitida transformando para undefined", () => {
            const parsedEmpty = validateSchema(listAppointmentsQuerySchema, { search: "" })
            expect(parsedEmpty.search).toBeUndefined()
            const parsedSpaces = validateSchema(listAppointmentsQuerySchema, { search: "   " })
            expect(parsedSpaces.search).toBeUndefined()
        })

        it("rejeita responsible inválido não numérico", () => {
            expect(() =>
                validateSchema(listAppointmentsQuerySchema, { responsible: "invalido" }),
            ).toThrow("Responsável inválido")
        })

        it("aceita responsible all, unassigned, me e ids numéricos", () => {
            expect(validateSchema(listAppointmentsQuerySchema, { responsible: "all" }).responsible).toBe("all")
            expect(validateSchema(listAppointmentsQuerySchema, { responsible: "unassigned" }).responsible).toBe("unassigned")
            expect(validateSchema(listAppointmentsQuerySchema, { responsible: "me" }).responsible).toBe("me")
            expect(validateSchema(listAppointmentsQuerySchema, { responsible: "42" }).responsible).toBe("42")
        })

        it("rejeita status inválido", () => {
            expect(() =>
                validateSchema(listAppointmentsQuerySchema, { status: "INVALIDO" }),
            ).toThrow("Dados inválidos")
        })

        it("rejeita period inválido", () => {
            expect(() =>
                validateSchema(listAppointmentsQuerySchema, { period: "ano_que_vem" }),
            ).toThrow("Dados inválidos")
        })
    })

    describe("appointmentIdParamSchema", () => {
        it("aceita ID numérico positivo dentro do limite de bigint", () => {
            const parsed = validateSchema(appointmentIdParamSchema, { id: "123" })
            expect(parsed.id).toBe("123")
            const maxBigint = validateSchema(appointmentIdParamSchema, { id: "9223372036854775807" })
            expect(maxBigint.id).toBe("9223372036854775807")
        })

        it("rejeita ID não numérico ou vazio", () => {
            expect(() => validateSchema(appointmentIdParamSchema, { id: "" })).toThrow("Dados inválidos")
            expect(() => validateSchema(appointmentIdParamSchema, { id: "abc" })).toThrow("ID do agendamento inválido")
            expect(() => validateSchema(appointmentIdParamSchema, { id: "123-abc" })).toThrow("ID do agendamento inválido")
        })

        it("rejeita ID que ultrapassa o limite de bigint", () => {
            expect(() =>
                validateSchema(appointmentIdParamSchema, { id: "999999999999999999999999999" }),
            ).toThrow("ID do agendamento inválido")
        })
    })

    describe("updateStatusBodySchema", () => {
        it("aceita ações válidas: claim, attended, no_show", () => {
            expect(validateSchema(updateStatusBodySchema, { action: "claim" })).toEqual({
                action: "claim",
            })
            expect(validateSchema(updateStatusBodySchema, { action: "attended" })).toEqual({
                action: "attended",
            })
            expect(validateSchema(updateStatusBodySchema, { action: "no_show" })).toEqual({
                action: "no_show",
            })
        })

        it("rejeita ação inválida", () => {
            expect(() =>
                validateSchema(updateStatusBodySchema, { action: "cancel" }),
            ).toThrow("Dados inválidos")
        })
    })
})
