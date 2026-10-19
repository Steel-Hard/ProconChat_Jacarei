import { screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentList from "@/testUtils/buildAppointmentList"
import buildAppointmentListItem from "@/testUtils/buildAppointmentListItem"
import renderAppointmentsPage from "@/testUtils/renderAppointmentsPage"
import setViewportWidth from "@/testUtils/setViewportWidth"

vi.setConfig({ testTimeout: 20000 })

type Page = Awaited<ReturnType<typeof renderAppointmentsPage>>

function renderOnSecondPage(initialEntry: string) {
    return renderAppointmentsPage({
        initialEntry,
        handlers: {
            "GET /api/v1/appointments": ({ url }) => ({
                status: 200,
                body: {
                    data: buildAppointmentList([buildAppointmentListItem()], {
                        total: 57,
                        page: Number(url.searchParams.get("page")),
                        totalPages: 3
                    })
                }
            })
        }
    })
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
    setViewportWidth(1440)
})

describe("Appointments.page: volta à página 1 com várias páginas", () => {
    it.each<[string, (page: Page) => Promise<void>, string]>([
        [
            "o chip",
            (page) => page.user.click(screen.getByRole("button", { name: /^Pendentes/ })),
            "status=PENDING&period=upcoming&responsible=all&page=1&limit=20"
        ],
        [
            "o período",
            (page) =>
                page.user.selectOptions(screen.getByRole("combobox", { name: "Período" }), "all"),
            "status=all&period=all&responsible=all&page=1&limit=20"
        ],
        [
            "o responsável",
            (page) =>
                page.user.selectOptions(
                    screen.getByRole("combobox", { name: "Responsável" }),
                    "unassigned"
                ),
            "status=all&period=upcoming&responsible=unassigned&page=1&limit=20"
        ]
    ])("%s escolhido na página 2 volta à página 1", async (_label, choose, expected) => {
        const page = await renderOnSecondPage("/agendamentos?page=2")
        expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument()

        await choose(page)

        await waitFor(() => expect(page.lastListRequest()).toBe(expected))
        expect(page.router.state.location.search).not.toContain("page=")
        expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument()
    })

    it("a ordem escolhida pelo título na página 2 volta à página 1", async () => {
        const page = await renderOnSecondPage("/agendamentos?page=2")
        expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument()

        await page.user.click(screen.getByRole("button", { name: "Data e hora" }))

        await waitFor(() =>
            expect(page.lastListRequest()).toBe(
                "status=all&period=upcoming&responsible=all&sortBy=appointment_datetime&sortOrder=asc&page=1&limit=20"
            )
        )
        expect(page.router.state.location.search).toBe("?sortBy=appointment_datetime&sortOrder=asc")
    })

    it("a ordem escolhida no Ordenar por na página 2 volta à página 1", async () => {
        setViewportWidth(1200)
        const page = await renderOnSecondPage("/agendamentos?page=2")
        expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument()

        await page.user.selectOptions(
            screen.getByRole("combobox", { name: "Ordenar por" }),
            "name:desc"
        )

        await waitFor(() =>
            expect(page.lastListRequest()).toBe(
                "status=all&period=upcoming&responsible=all&sortBy=name&sortOrder=desc&page=1&limit=20"
            )
        )
        expect(page.router.state.location.search).toBe("?sortBy=name&sortOrder=desc")
    })
})
