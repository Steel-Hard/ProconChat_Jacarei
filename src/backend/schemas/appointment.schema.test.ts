import { describe, expect, it } from "vitest"
import {
  appointmentIdParamSchema,
  listAppointmentsQuerySchema,
  updateStatusBodySchema,
  validateSchema,
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
    it("aceita ID numérico ou UUID", () => {
      const parsed = validateSchema(appointmentIdParamSchema, { id: "123" })
      expect(parsed.id).toBe("123")

      const parsedUuid = validateSchema(appointmentIdParamSchema, {
        id: "a1b2c3d4-0000-0000-0000-000000000001",
      })
      expect(parsedUuid.id).toBe("a1b2c3d4-0000-0000-0000-000000000001")
    })

    it("rejeita ID vazio", () => {
      expect(() =>
        validateSchema(appointmentIdParamSchema, { id: "" }),
      ).toThrow("Dados inválidos")
    })
  })

  describe("updateStatusBodySchema", () => {
    it("aceita ações válidas: claim, attended, no_show", () => {
      expect(validateSchema(updateStatusBodySchema, { action: "claim" })).toEqual({
        action: "claim",
      })
      expect(
        validateSchema(updateStatusBodySchema, { action: "attended" }),
      ).toEqual({
        action: "attended",
      })
      expect(
        validateSchema(updateStatusBodySchema, { action: "no_show" }),
      ).toEqual({
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
