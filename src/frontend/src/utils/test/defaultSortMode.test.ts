import { describe, expect, it } from "vitest"
import defaultSortMode from "@/utils/defaultSortMode"
import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"
import type AppointmentPeriod from "@/types/appointments/AppointmentPeriod.types"
import type AppointmentStatusFilter from "@/types/appointments/AppointmentStatusFilter.types"

function filters(
    status: AppointmentStatusFilter,
    period: AppointmentPeriod
): AppointmentListFilters {
    return { status, period, responsible: "all", page: 1 }
}

describe("defaultSortMode", () => {
    it.each<AppointmentStatusFilter>(["PENDING", "CONFIRMED", "waiting_record"])(
        "é asc com o chip %s, mesmo com período Todos",
        (status) => {
            expect(defaultSortMode(filters(status, "all"), false)).toBe("asc")
            expect(defaultSortMode(filters(status, "past"), false)).toBe("asc")
        }
    )

    it.each<AppointmentStatusFilter>(["ATTENDED", "NO_SHOW", "CANCELED"])(
        "é desc com o chip terminal %s, mesmo com período Todos",
        (status) => {
            expect(defaultSortMode(filters(status, "all"), false)).toBe("desc")
            expect(defaultSortMode(filters(status, "upcoming"), false)).toBe("desc")
        }
    )

    it.each<AppointmentPeriod>(["today", "this_week", "upcoming"])(
        "é asc com o chip Todos e o período %s",
        (period) => {
            expect(defaultSortMode(filters("all", period), false)).toBe("asc")
        }
    )

    it("é desc com o chip Todos e o período Anteriores a hoje", () => {
        expect(defaultSortMode(filters("all", "past"), false)).toBe("desc")
    })

    it("é mista com o chip Todos e o período Todos", () => {
        expect(defaultSortMode(filters("all", "all"), false)).toBe("mixed")
    })

    it("é mista durante a busca, qualquer que seja o filtro", () => {
        expect(defaultSortMode(filters("CANCELED", "past"), true)).toBe("mixed")
    })
})
