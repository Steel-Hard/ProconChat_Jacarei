import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import AppointmentSortSelect from "@/components/AppointmentSortSelect"

vi.setConfig({ testTimeout: 20000 })

const OPTIONS = [
    { value: "default", label: "Padrão do filtro" },
    { value: "name:asc", label: "Titular ▲ (A–Z)" }
]

describe("AppointmentSortSelect", () => {
    it("mostra o seletor com o rótulo e o valor atual", () => {
        render(
            <AppointmentSortSelect
                label="Ordenar por"
                options={OPTIONS}
                value="default"
                onChange={vi.fn()}
            />
        )

        expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("default")
    })

    it("avisa a ordem escolhida", async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(
            <AppointmentSortSelect
                label="Ordenar por"
                options={OPTIONS}
                value="default"
                onChange={onChange}
            />
        )

        await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "name:asc")

        expect(onChange).toHaveBeenCalledWith("name:asc")
    })
})
