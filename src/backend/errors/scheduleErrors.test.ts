import { describe, expect, it } from "vitest"
import BookingFailedError from "./BookingFailedError"
import DuplicateAppointmentError from "./DuplicateAppointmentError"
import ScheduleNotConfiguredError from "./ScheduleNotConfiguredError"
import SlotFullError from "./SlotFullError"

describe("Schedule AppErrors", () => {
    it("instancia SlotFullError com status 409 e código correto", () => {
        const error = new SlotFullError()
        expect(error.statusCode).toBe(409)
        expect(error.code).toBe("SLOT_FULL")
        expect(error.message).toBe("O horário selecionado não possui mais vagas")
    })

    it("instancia DuplicateAppointmentError com status 409 e código correto", () => {
        const error = new DuplicateAppointmentError()
        expect(error.statusCode).toBe(409)
        expect(error.code).toBe("DUPLICATE_APPOINTMENT")
        expect(error.message).toBe("Você já possui um agendamento ativo para este mesmo horário")
    })

    it("instancia ScheduleNotConfiguredError com status 500 e código correto", () => {
        const error = new ScheduleNotConfiguredError()
        expect(error.statusCode).toBe(500)
        expect(error.code).toBe("SCHEDULE_NOT_CONFIGURED")
        expect(error.message).toBe("Agenda não configurada")
    })

    it("instancia BookingFailedError com status 500 e código correto", () => {
        const error = new BookingFailedError()
        expect(error.statusCode).toBe(500)
        expect(error.code).toBe("BOOKING_FAILED")
        expect(error.message).toBe("Falha ao inserir agendamento")
    })
})
