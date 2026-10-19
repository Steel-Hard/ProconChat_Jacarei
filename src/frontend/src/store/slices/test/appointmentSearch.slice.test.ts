import { describe, expect, it } from "vitest"
import accountSlice from "@/store/slices/account.slice"
import appointmentSearchSlice from "@/store/slices/appointmentSearch.slice"

const { searchChanged, searchCleared } = appointmentSearchSlice.actions
const reducer = appointmentSearchSlice.reducer

describe("appointmentSearchSlice", () => {
    it("começa sem termo", () => {
        expect(reducer(undefined, { type: "@@init" })).toEqual({ term: "" })
    })

    it("guarda o termo digitado como veio", () => {
        expect(reducer(undefined, searchChanged(" Maria "))).toEqual({ term: " Maria " })
    })

    it("apaga o termo ao limpar a busca", () => {
        expect(reducer({ term: "12345678901" }, searchCleared())).toEqual({ term: "" })
    })

    it("apaga o termo quando a conta sai do painel", () => {
        expect(reducer({ term: "12345678901" }, accountSlice.actions.accountCleared())).toEqual({
            term: ""
        })
    })
})
