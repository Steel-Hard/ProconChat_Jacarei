import { describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { render, screen, within } from "@testing-library/react"
import SidebarGroup from "@/components/SidebarGroup"
import ROUTES from "@/routers/paths"

describe("SidebarGroup", () => {
    it("mostra o rótulo do grupo e a lista dos itens nomeada por ele", () => {
        render(
            <MemoryRouter>
                <SidebarGroup
                    group={{
                        key: "chatbot",
                        items: [
                            { key: "content", path: ROUTES.content },
                            { key: "sessions", path: ROUTES.sessions }
                        ]
                    }}
                    activeKey="sessions"
                    badges={{}}
                />
            </MemoryRouter>
        )

        const list = screen.getByRole("list", { name: "Chatbot" })
        expect(
            within(list)
                .getAllByRole("link")
                .map((link) => link.textContent)
        ).toEqual(["Conteúdo", "Sessões"])
        expect(within(list).getByRole("link", { name: "Sessões" })).toHaveAttribute(
            "aria-current",
            "page"
        )
    })
})
