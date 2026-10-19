import { describe, expect, it } from "vitest"
import parseAppointmentListParams from "@/utils/parseAppointmentListParams"
import type AppointmentListFilters from "@/types/appointments/AppointmentListFilters.types"

const DEFAULTS: AppointmentListFilters = {
    status: "all",
    period: "upcoming",
    responsible: "all",
    page: 1
}

function parse(query: string): AppointmentListFilters {
    return parseAppointmentListParams(new URLSearchParams(query))
}

describe("parseAppointmentListParams", () => {
    it("usa os padrões sem parâmetros", () => {
        expect(parse("")).toEqual(DEFAULTS)
    })

    it("lê os filtros, a ordem e a página válidos", () => {
        expect(
            parse(
                "status=waiting_record&period=past&responsible=unassigned&sortBy=responsible&sortOrder=desc&page=4"
            )
        ).toEqual({
            status: "waiting_record",
            period: "past",
            responsible: "unassigned",
            sortBy: "responsible",
            sortOrder: "desc",
            page: 4
        })
    })

    it.each([
        ["status=foo", "status"],
        ["status=pending", "status"],
        ["period=", "period"],
        ["period=semana", "period"],
        ["responsible=7", "responsible"],
        ["page=0", "page"],
        ["page=-2", "page"],
        ["page=abc", "page"],
        ["page=1.5", "page"]
    ])("cai no padrão com %s", (query) => {
        expect(parse(query)).toEqual(DEFAULTS)
    })

    it("ignora sortBy fora da lista e o sortOrder que vem sozinho", () => {
        expect(parse("sortBy=cpf&sortOrder=desc")).toEqual(DEFAULTS)
        expect(parse("sortOrder=desc")).toEqual(DEFAULTS)
    })

    it("usa asc quando o sortBy vem sem sortOrder válido", () => {
        expect(parse("sortBy=name")).toEqual({ ...DEFAULTS, sortBy: "name", sortOrder: "asc" })
        expect(parse("sortBy=status&sortOrder=up")).toEqual({
            ...DEFAULTS,
            sortBy: "status",
            sortOrder: "asc"
        })
    })

    it("nunca lê a busca da URL", () => {
        expect(parse("search=12345678901")).toEqual(DEFAULTS)
    })
})
