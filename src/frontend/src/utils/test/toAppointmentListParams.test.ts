import { describe, expect, it } from "vitest"
import parseAppointmentListParams from "@/utils/parseAppointmentListParams"
import toAppointmentListParams from "@/utils/toAppointmentListParams"
import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"

const DEFAULTS: AppointmentListFilters = {
    status: "all",
    period: "upcoming",
    responsible: "all",
    page: 1
}

describe("toAppointmentListParams", () => {
    it("deixa a URL vazia com os filtros padrão", () => {
        expect(toAppointmentListParams(DEFAULTS).toString()).toBe("")
    })

    it("escreve só o que difere do padrão", () => {
        expect(
            toAppointmentListParams({ ...DEFAULTS, status: "PENDING", page: 2 }).toString()
        ).toBe("status=PENDING&page=2")
    })

    it("escreve a ordem escolhida", () => {
        expect(
            toAppointmentListParams({ ...DEFAULTS, sortBy: "name", sortOrder: "desc" }).toString()
        ).toBe("sortBy=name&sortOrder=desc")
    })

    it("nunca escreve a busca", () => {
        expect(toAppointmentListParams({ ...DEFAULTS, search: "12345678901" }).has("search")).toBe(
            false
        )
    })

    it.each<AppointmentListFilters>([
        DEFAULTS,
        { status: "CANCELED", period: "all", responsible: "me", page: 3 },
        {
            status: "waiting_record",
            period: "this_week",
            responsible: "unassigned",
            sortBy: "appointment_datetime",
            sortOrder: "asc",
            page: 1
        },
        { ...DEFAULTS, period: "today", sortBy: "status", sortOrder: "desc", page: 9 }
    ])("preserva o filtro válido na ida e volta (%o)", (filters) => {
        expect(parseAppointmentListParams(toAppointmentListParams(filters))).toEqual(filters)
    })
})
