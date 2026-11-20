import { describe, expect, it } from "vitest"
import { DocumentsStubRepository } from "../repositories/mock/documentsStub.repository"
import { createDocumentsService } from "./documents.service"

const PREFIXO = "Você receberá neste número avisos sobre este agendamento, como "

function serviceWith(options: { reminderEnabled: boolean; reminderHours?: number; noticeEnabled: boolean }) {
    const repository = new DocumentsStubRepository()
    repository.scheduleContext = {
        unitAddress: "Avenida Central, 100",
        unitAddressComplement: null,
        reminderEnabled: options.reminderEnabled,
        reminderHours: options.reminderHours ?? 24
    }
    return createDocumentsService({ documents: repository, isCancellationNoticeEnabled: async () => options.noticeEnabled })
}

const args = { byRepresentative: false, groupDocuments: ["RG"] }

describe("prévia da confirmação em Documentos: frase de avisos (#164)", () => {
    it("lembrete e aviso de cancelamento ligados citam os dois", async () => {
        const preview = await serviceWith({ reminderEnabled: true, noticeEnabled: true }).previewConfirmation(args)

        expect(preview.notice).toBe(`${PREFIXO}um lembrete 24 horas antes do atendimento e o aviso em caso de cancelamento.`)
        expect(preview.text.endsWith(preview.notice as string)).toBe(true)
    })

    it("só o lembrete ligado cita só o lembrete", async () => {
        const preview = await serviceWith({ reminderEnabled: true, noticeEnabled: false }).previewConfirmation(args)

        expect(preview.notice).toBe(`${PREFIXO}um lembrete 24 horas antes do atendimento.`)
    })

    it("só o aviso de cancelamento ligado cita só o cancelamento", async () => {
        const preview = await serviceWith({ reminderEnabled: false, noticeEnabled: true }).previewConfirmation(args)

        expect(preview.notice).toBe(`${PREFIXO}o aviso em caso de cancelamento.`)
    })

    it("os dois desligados deixam a frase nula e o texto termina nos documentos", async () => {
        const preview = await serviceWith({ reminderEnabled: false, noticeEnabled: false }).previewConfirmation(args)

        expect(preview.notice).toBeNull()
        expect(preview.text.endsWith("• RG")).toBe(true)
    })

    it("uma hora de antecedência vira 1 hora", async () => {
        const preview = await serviceWith({ reminderEnabled: true, reminderHours: 1, noticeEnabled: false }).previewConfirmation(args)

        expect(preview.notice).toBe(`${PREFIXO}um lembrete 1 hora antes do atendimento.`)
    })
})
