import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import UserAccountList from "@/components/UserAccountList"
import type UserAccountRowView from "@/types/users/UserAccountRowView.types"

const TEXTS = { admin: "ADMIN", unsaved: "Não salvo" }

function rowView(id: number, name: string): UserAccountRowView {
    return {
        id,
        initials: name.slice(0, 2).toUpperCase(),
        name,
        isAdmin: false,
        summary: `${name.toLowerCase()}@exemplo.gov.br · 0 de 8 permissões`,
        lastLogin: "Nunca acessou",
        active: id !== 3,
        statusLabel: id === 3 ? "Inativo" : "Ativo",
        unsaved: false,
        selected: id === 1
    }
}

describe("UserAccountList", () => {
    it("mostra as contas na ordem recebida, numa lista com nome acessível", () => {
        render(
            <UserAccountList
                label="Contas"
                rows={[rowView(1, "Ana"), rowView(7, "Bruno"), rowView(3, "Carla")]}
                texts={TEXTS}
                onSelect={vi.fn()}
            />
        )

        const items = within(screen.getByRole("list", { name: "Contas" })).getAllByRole("listitem")
        expect(items.map((item) => within(item).getByRole("button").textContent)).toEqual([
            expect.stringContaining("Ana"),
            expect.stringContaining("Bruno"),
            expect.stringContaining("Carla")
        ])
        expect(within(items[2]).getByText("Inativo")).toBeInTheDocument()
    })

    it("avisa qual conta foi escolhida", async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()
        render(
            <UserAccountList
                label="Contas"
                rows={[rowView(1, "Ana"), rowView(7, "Bruno")]}
                texts={TEXTS}
                onSelect={onSelect}
            />
        )

        await user.click(screen.getByRole("button", { name: /Bruno/ }))

        expect(onSelect).toHaveBeenCalledWith(7)
    })
})
