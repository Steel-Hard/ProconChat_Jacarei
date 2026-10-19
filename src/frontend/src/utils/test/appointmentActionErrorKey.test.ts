import { describe, expect, it } from "vitest"
import appointmentActionErrorKey from "@/utils/appointmentActionErrorKey"
import type AppointmentActionCode from "@/types/appointments/AppointmentActionCode.types"

const CODES: AppointmentActionCode[] = [
    "APPOINTMENT_ALREADY_CLAIMED",
    "ALREADY_ATTENDED",
    "ALREADY_NO_SHOW",
    "APPOINTMENT_CANCELED",
    "ATTENDANCE_NOT_YET_AVAILABLE",
    "NO_SHOW_NOT_YET_AVAILABLE"
]

function apiError(status: number, code: string) {
    return { status, data: { error: { code, message: "x" } } }
}

describe("appointmentActionErrorKey", () => {
    it.each(CODES)("usa a mensagem do code %s no 409", (code) => {
        expect(appointmentActionErrorKey(apiError(409, code))).toBe(
            `appointmentActions.errors.${code}`
        )
    })

    it("usa a mensagem genérica num 409 com code desconhecido", () => {
        expect(appointmentActionErrorKey(apiError(409, "OUTRO"))).toBe(
            "appointmentActions.errors.failed"
        )
    })

    it("usa a mensagem de origem inválida no 403 INVALID_ORIGIN", () => {
        expect(appointmentActionErrorKey(apiError(403, "INVALID_ORIGIN"))).toBe(
            "errors.invalidOrigin"
        )
    })

    it("usa a mensagem de falta de permissão no 403 FORBIDDEN", () => {
        expect(appointmentActionErrorKey(apiError(403, "FORBIDDEN"))).toBe(
            "appointmentActions.errors.forbidden"
        )
    })

    it("usa a mensagem de não encontrado no 404", () => {
        expect(appointmentActionErrorKey(apiError(404, "NOT_FOUND"))).toBe(
            "appointmentActions.errors.notFound"
        )
    })

    it("usa a mensagem genérica no 500", () => {
        expect(appointmentActionErrorKey(apiError(500, "INTERNAL_ERROR"))).toBe(
            "appointmentActions.errors.failed"
        )
    })

    it("usa a mensagem genérica no erro de rede", () => {
        expect(
            appointmentActionErrorKey({
                status: "FETCH_ERROR",
                error: "TypeError: Failed to fetch"
            })
        ).toBe("appointmentActions.errors.failed")
    })

    it("usa a mensagem genérica no erro serializado e sem erro", () => {
        expect(appointmentActionErrorKey({ message: "falhou" })).toBe(
            "appointmentActions.errors.failed"
        )
        expect(appointmentActionErrorKey(undefined)).toBe("appointmentActions.errors.failed")
    })

    it("usa a mensagem genérica quando o corpo do 409 não tem o envelope de erro", () => {
        expect(appointmentActionErrorKey({ status: 409, data: null })).toBe(
            "appointmentActions.errors.failed"
        )
    })
})
