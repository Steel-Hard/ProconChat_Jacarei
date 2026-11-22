import { describe, expect, it } from "vitest"
import i18n from "@/i18n/i18n"

const text = i18n.getFixedT("pt-BR", "schedule") as unknown as (
    key: string,
    options?: Record<string, unknown>
) => string

describe("textos do modal de conflitos na origem salvar", () => {
    it.each([
        [1, 1, "1 agendamento cancelado. 1 aviso falhou."],
        [2, 1, "2 agendamentos cancelados. 1 aviso falhou."],
        [3, 2, "3 agendamentos cancelados. 2 avisos falharam."]
    ])("diz %i cancelados e %i falhas numa frase só", (canceled, failed, expected) => {
        expect(
            text("conflictModal.save.canceledWithFailures", {
                count: canceled,
                failedCount: failed
            })
        ).toBe(expected)
    })

    it("tem a abertura com as duas permissões", () => {
        expect(text("conflictModal.save.descriptionWithCancel")).toBe(
            "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração nova. Escolha o que fazer antes de salvar."
        )
    })

    it("tem a abertura só com Configurar atendimento presencial", () => {
        expect(text("conflictModal.save.descriptionKeepOnly")).toBe(
            "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração nova. Você não pode cancelar agendamentos. Mantenha-os para salvar a alteração, ou volte sem salvar."
        )
    })

    it("tem as opções e o voltar da origem salvar", () => {
        expect(text("conflictModal.save.keepDescription")).toBe(
            'Continuam válidos e ganham o selo "Fora da grade atual" na lista e no detalhe. Nenhum aviso é enviado.'
        )
        expect(text("conflictModal.save.keepAction")).toBe("Manter os agendamentos")
        expect(text("conflictModal.save.cancelActionOn")).toBe("Cancelar e avisar os cidadãos")
        expect(text("conflictModal.save.cancelActionOff")).toBe("Cancelar agendamentos")
        expect(text("conflictModal.save.back")).toBe("← Voltar sem salvar")
    })

    it("tem a mensagem de lista ou aviso que mudou", () => {
        expect(text("conflictModal.changedNotice")).toBe(
            "A lista de agendamentos afetados ou o aviso ao cidadão mudou desde que você abriu esta janela. Confira antes de escolher."
        )
    })

    it("tem a dica por permissão da lista de afetados", () => {
        expect(text("conflicts.hintWithCancel")).toBe(
            "Ao salvar, você poderá manter estes agendamentos fora da grade atual ou cancelá-los."
        )
        expect(text("conflicts.hintKeepOnly")).toBe(
            "Ao salvar, você poderá manter estes agendamentos fora da grade atual. Para cancelá-los, peça a quem gerencia os agendamentos."
        )
    })
})
