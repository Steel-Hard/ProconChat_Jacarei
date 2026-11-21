import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContentPreviewWindow from "@/components/ContentPreviewWindow"
import type ContentPreviewModel from "@/types/content/ContentPreviewModel.types"

const model: ContentPreviewModel = {
    list: {
        text: "Escolha",
        buttonText: "Ver perguntas",
        rows: [{ key: "0-q_1", title: "Primeira", description: null, isCurrent: true }]
    },
    primaryBubbles: [{ id: "official", text: "Resposta oficial", footerLabel: null, buttons: [] }],
    fallbackBubbles: [],
    lengthWarning: null
}

function Harness({ onClose }: { onClose?: () => void }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Abrir prévia
            </button>
            {open ? (
                <ContentPreviewWindow
                    status="ready"
                    model={model}
                    onClose={() => {
                        onClose?.()
                        setOpen(false)
                    }}
                    onRetry={vi.fn()}
                />
            ) : null}
        </>
    )
}

describe("ContentPreviewWindow", () => {
    it("abre como diálogo modal com o título da prévia e leva o foco a ele", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.click(screen.getByRole("button", { name: "Abrir prévia" }))

        const dialog = screen.getByRole("dialog", { name: "Como o cidadão recebe" })

        expect(dialog).toHaveAttribute("aria-modal", "true")
        expect(screen.getByRole("heading", { name: "Como o cidadão recebe" })).toHaveFocus()
    })

    it("Esc fecha só a prévia e devolve o foco ao botão que abriu", async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        render(<Harness onClose={onClose} />)

        await user.click(screen.getByRole("button", { name: "Abrir prévia" }))
        await user.keyboard("{Escape}")

        expect(onClose).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Abrir prévia" })).toHaveFocus()
    })

    it("Fechar prévia também devolve o foco ao botão que abriu", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.click(screen.getByRole("button", { name: "Abrir prévia" }))
        await user.click(screen.getByRole("button", { name: "Fechar" }))

        expect(screen.getByRole("button", { name: "Abrir prévia" })).toHaveFocus()
    })

    it("Tab fica preso dentro da janela da prévia", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.click(screen.getByRole("button", { name: "Abrir prévia" }))
        await user.tab()
        await user.tab()
        await user.tab()

        expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true)
    })
})
