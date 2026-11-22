import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ScheduleConflictModal from "@/components/ScheduleConflictModal"
import type ScheduleConflict from "@/types/schedule/ScheduleConflict.types"

type ModalProps = Parameters<typeof ScheduleConflictModal>[0]

const CONFLICTS: ScheduleConflict[] = [
    {
        id: "41",
        protocol: "A1B2C3D4",
        name: "Maria Souza",
        cpfMasked: "***.982.247-**",
        date: "2026-11-04",
        time: "09:00",
        status: "CONFIRMED",
        code: "DATE_BLOCKED",
        reason: "Data bloqueada: Feriado"
    }
]

const SAVE_WITH_CANCEL =
    "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração nova. Escolha o que fazer antes de salvar."
const SAVE_KEEP_ONLY =
    "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração nova. Você não pode cancelar agendamentos. Mantenha-os para salvar a alteração, ou volte sem salvar."
const CANCEL_WITH_CANCEL =
    "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração anterior, que voltaria a valer. Escolha o que fazer antes de cancelar a mudança."
const CANCEL_KEEP_ONLY =
    "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração anterior, que voltaria a valer. Você não pode cancelar agendamentos. Mantenha-os para cancelar a mudança, ou volte sem cancelar."
const CHANGED_NOTICE =
    "A lista de agendamentos afetados ou o aviso ao cidadão mudou desde que você abriu esta janela. Confira antes de escolher."

function propsWith(overrides: Partial<ModalProps> = {}): ModalProps {
    return {
        conflicts: CONFLICTS,
        origin: "save",
        changeDate: null,
        changedNotice: false,
        canManageAppointments: true,
        noticeEnabled: true,
        noticeProblemCode: null,
        noticeLoading: false,
        noticeFailed: false,
        busy: false,
        error: null,
        onRetryNotice: vi.fn(),
        onKeep: vi.fn(),
        onCancelAppointments: vi.fn(),
        onClose: vi.fn(),
        ...overrides
    }
}

function renderModal(overrides: Partial<ModalProps> = {}) {
    const props = propsWith(overrides)

    render(<ScheduleConflictModal {...props} />)

    return props
}

function ModalHarness() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Abrir modal
            </button>
            <ScheduleConflictModal
                {...propsWith({
                    conflicts: open ? CONFLICTS : null,
                    onClose: () => setOpen(false)
                })}
            />
        </>
    )
}

describe("ScheduleConflictModal", () => {
    describe("origem salvar", () => {
        it("mostra título, abertura, opções e voltar da origem salvar com as duas permissões", () => {
            renderModal()

            expect(
                screen.getByRole("heading", { name: "Esta alteração afeta 1 agendamento" })
            ).toBeInTheDocument()
            expect(screen.getByText(SAVE_WITH_CANCEL)).toBeInTheDocument()
            expect(
                screen.getByRole("button", { name: "Manter os agendamentos" })
            ).toBeInTheDocument()
            expect(
                screen.getByRole("button", { name: "Cancelar e avisar os cidadãos" })
            ).toBeInTheDocument()
            expect(screen.getByRole("button", { name: "← Voltar sem salvar" })).toBeInTheDocument()
        })

        it("mostra a abertura só com Configurar e oferece apenas Manter e voltar", () => {
            renderModal({ canManageAppointments: false })

            expect(screen.getByText(SAVE_KEEP_ONLY)).toBeInTheDocument()
            expect(
                screen.getByRole("button", { name: "Manter os agendamentos" })
            ).toBeInTheDocument()
            expect(screen.getByRole("button", { name: "← Voltar sem salvar" })).toBeInTheDocument()
            expect(screen.queryByRole("button", { name: /Cancelar/ })).not.toBeInTheDocument()
        })

        it("usa o texto de cancelar sem aviso quando o aviso está desligado", () => {
            renderModal({ noticeEnabled: false })

            expect(
                screen.getByRole("button", { name: "Cancelar agendamentos" })
            ).toBeInTheDocument()
        })
    })

    describe("origem cancelar mudança agendada", () => {
        const origin = { origin: "cancelScheduledChange", changeDate: "05/12" } as const

        it("mostra título com a data, abertura, opções e voltar da origem cancelar mudança", () => {
            renderModal(origin)

            expect(
                screen.getByRole("heading", {
                    name: "Cancelar a mudança de 05/12 afeta 1 agendamento"
                })
            ).toBeInTheDocument()
            expect(screen.getByText(CANCEL_WITH_CANCEL)).toBeInTheDocument()
            expect(
                screen.getByText(
                    'A mudança é cancelada e estes agendamentos continuam válidos, com o selo "Fora da grade atual". Nenhum aviso é enviado.'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole("button", {
                    name: "Cancelar a mudança, os agendamentos e avisar os cidadãos"
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole("button", { name: "← Voltar sem cancelar a mudança" })
            ).toBeInTheDocument()
        })

        it("usa o plural no título", () => {
            renderModal({ ...origin, conflicts: [...CONFLICTS, { ...CONFLICTS[0], id: "42" }] })

            expect(
                screen.getByRole("heading", {
                    name: "Cancelar a mudança de 05/12 afeta 2 agendamentos"
                })
            ).toBeInTheDocument()
        })

        it("mostra a abertura só com Configurar e oferece apenas Manter e voltar", () => {
            renderModal({ ...origin, canManageAppointments: false })

            expect(screen.getByText(CANCEL_KEEP_ONLY)).toBeInTheDocument()
            expect(
                screen.getByRole("button", { name: "← Voltar sem cancelar a mudança" })
            ).toBeInTheDocument()
            expect(
                screen.queryByRole("button", { name: /Cancelar a mudança, os agendamentos/ })
            ).not.toBeInTheDocument()
        })

        it("usa o texto de cancelar sem aviso quando o aviso está desligado", () => {
            renderModal({ ...origin, noticeEnabled: false })

            expect(
                screen.getByRole("button", { name: "Cancelar a mudança e os agendamentos" })
            ).toBeInTheDocument()
        })
    })

    describe("mensagem de atualização", () => {
        it("aparece quando a página indica que a lista ou o aviso mudou", () => {
            renderModal({ changedNotice: true })

            expect(screen.getByText(CHANGED_NOTICE)).toBeInTheDocument()
        })

        it("não aparece na primeira abertura", () => {
            renderModal()

            expect(screen.queryByText(CHANGED_NOTICE)).not.toBeInTheDocument()
        })
    })

    describe("carregamento do aviso", () => {
        it("esconde o botão de cancelar e mostra a verificação enquanto carrega", () => {
            renderModal({ noticeLoading: true, noticeEnabled: null })

            expect(screen.getByText("Verificando o aviso ao cidadão...")).toBeInTheDocument()
            expect(screen.queryByRole("button", { name: /Cancelar/ })).not.toBeInTheDocument()
            expect(
                screen.getByRole("button", { name: "Manter os agendamentos" })
            ).toBeInTheDocument()
            expect(screen.getByRole("button", { name: "← Voltar sem salvar" })).toBeInTheDocument()
        })

        it("esconde o botão de cancelar e oferece tentar de novo quando a verificação falha", async () => {
            const user = userEvent.setup()
            const props = renderModal({ noticeFailed: true, noticeEnabled: null })

            expect(screen.queryByRole("button", { name: /Cancelar/ })).not.toBeInTheDocument()
            expect(screen.getByRole("alert")).toHaveTextContent(
                "Não foi possível verificar o aviso ao cidadão. Tente de novo."
            )
            await user.click(screen.getByRole("button", { name: "Tentar de novo" }))

            expect(props.onRetryNotice).toHaveBeenCalledTimes(1)
            expect(
                screen.getByRole("button", { name: "Manter os agendamentos" })
            ).toBeInTheDocument()
        })
    })

    describe("teclado", () => {
        it("foca Manter os agendamentos ao abrir", () => {
            renderModal()

            expect(screen.getByRole("button", { name: "Manter os agendamentos" })).toHaveFocus()
        })

        it("circula o foco só dentro do modal com Tab e Shift+Tab", async () => {
            const user = userEvent.setup()
            renderModal()
            const keep = screen.getByRole("button", { name: "Manter os agendamentos" })
            const cancel = screen.getByRole("button", { name: "Cancelar e avisar os cidadãos" })
            const back = screen.getByRole("button", { name: "← Voltar sem salvar" })

            await user.tab()
            expect(cancel).toHaveFocus()

            await user.tab()
            expect(back).toHaveFocus()

            await user.tab()
            expect(keep).toHaveFocus()

            await user.tab({ shift: true })
            expect(back).toHaveFocus()
        })

        it("devolve o foco ao elemento anterior ao fechar pelo voltar", async () => {
            const user = userEvent.setup()
            render(<ModalHarness />)
            const opener = screen.getByRole("button", { name: "Abrir modal" })

            await user.click(opener)
            await user.click(screen.getByRole("button", { name: "← Voltar sem salvar" }))

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
            expect(opener).toHaveFocus()
        })

        it("devolve o foco ao elemento anterior ao fechar pelo Esc", async () => {
            const user = userEvent.setup()
            render(<ModalHarness />)
            const opener = screen.getByRole("button", { name: "Abrir modal" })

            await user.click(opener)
            await user.keyboard("{Escape}")

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
            expect(opener).toHaveFocus()
        })

        it("fecha com Esc quando não há ação em andamento", async () => {
            const user = userEvent.setup()
            const props = renderModal()

            await user.keyboard("{Escape}")

            expect(props.onClose).toHaveBeenCalledTimes(1)
        })

        it("não fecha com Esc durante uma ação em andamento", async () => {
            const user = userEvent.setup()
            const props = renderModal({ busy: true })

            await user.keyboard("{Escape}")

            expect(props.onClose).not.toHaveBeenCalled()
        })
    })

    describe("clique", () => {
        it("não fecha com clique fora do modal", () => {
            const props = renderModal()

            fireEvent.click(screen.getByRole("presentation"))

            expect(props.onClose).not.toHaveBeenCalled()
        })

        it("chama as ações de manter, cancelar e voltar", async () => {
            const user = userEvent.setup()
            const props = renderModal()

            await user.click(screen.getByRole("button", { name: "Manter os agendamentos" }))
            await user.click(screen.getByRole("button", { name: "Cancelar e avisar os cidadãos" }))
            await user.click(screen.getByRole("button", { name: "← Voltar sem salvar" }))

            expect(props.onKeep).toHaveBeenCalledTimes(1)
            expect(props.onCancelAppointments).toHaveBeenCalledTimes(1)
            expect(props.onClose).toHaveBeenCalledTimes(1)
        })

        it("desabilita as ações durante uma ação em andamento", () => {
            renderModal({ busy: true })

            expect(screen.getByRole("button", { name: "Manter os agendamentos" })).toBeDisabled()
            expect(
                screen.getByRole("button", { name: "Cancelar e avisar os cidadãos" })
            ).toBeDisabled()
            expect(screen.getByRole("button", { name: "← Voltar sem salvar" })).toBeDisabled()
        })
    })
})
