import { describe, expect, it } from "vitest"
import i18n from "@/i18n/i18n"

const text = i18n.getFixedT("pt-BR", "schedule") as unknown as (
    key: string,
    options?: Record<string, unknown>
) => string

function cancelKey(name: string): string {
    return `conflictModal.cancelScheduledChange.${name}`
}

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

describe("textos do modal de conflitos na origem cancelar mudança agendada", () => {
    it.each([
        [1, "Cancelar a mudança de 05/12 afeta 1 agendamento"],
        [2, "Cancelar a mudança de 05/12 afeta 2 agendamentos"]
    ])("monta o título com a data e %i agendamento(s)", (count, expected) => {
        expect(text("conflictModal.cancelScheduledChange.title", { count, date: "05/12" })).toBe(
            expected
        )
    })

    it.each([
        [1, 1, "Mudança cancelada. 1 agendamento cancelado. 1 aviso falhou."],
        [2, 1, "Mudança cancelada. 2 agendamentos cancelados. 1 aviso falhou."],
        [3, 2, "Mudança cancelada. 3 agendamentos cancelados. 2 avisos falharam."]
    ])("diz %i cancelados e %i falhas numa frase só", (canceled, failed, expected) => {
        expect(
            text("conflictModal.cancelScheduledChange.canceledWithFailures", {
                count: canceled,
                failedCount: failed
            })
        ).toBe(expected)
    })

    it.each([
        [
            "keptToast",
            1,
            'Mudança cancelada. 1 agendamento mantido com o selo "Fora da grade atual".'
        ],
        [
            "keptToast",
            2,
            'Mudança cancelada. 2 agendamentos mantidos com o selo "Fora da grade atual".'
        ],
        [
            "canceledOnToast",
            1,
            "Mudança cancelada. 1 agendamento cancelado e cidadão avisado por WhatsApp."
        ],
        [
            "canceledOnToast",
            2,
            "Mudança cancelada. 2 agendamentos cancelados e cidadãos avisados por WhatsApp."
        ],
        [
            "canceledOffToast",
            1,
            "Mudança cancelada. 1 agendamento cancelado. O cidadão não foi avisado pelo sistema."
        ],
        [
            "canceledOffToast",
            2,
            "Mudança cancelada. 2 agendamentos cancelados. Os cidadãos não foram avisados pelo sistema."
        ]
    ])("tem o resultado %s com %i agendamento(s)", (key, count, expected) => {
        expect(text(`conflictModal.cancelScheduledChange.${key}`, { count })).toBe(expected)
    })

    it("mantém o resultado de mantidos da origem salvar com Alteração salva", () => {
        expect(text("conflictModal.keptToast", { count: 1 })).toBe(
            'Alteração salva. 1 agendamento mantido com o selo "Fora da grade atual".'
        )
    })

    it("tem a abertura com as duas permissões", () => {
        expect(text("conflictModal.cancelScheduledChange.descriptionWithCancel")).toBe(
            "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração anterior, que voltaria a valer. Escolha o que fazer antes de cancelar a mudança."
        )
    })

    it("tem a abertura só com Configurar atendimento presencial", () => {
        expect(text("conflictModal.cancelScheduledChange.descriptionKeepOnly")).toBe(
            "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração anterior, que voltaria a valer. Você não pode cancelar agendamentos. Mantenha-os para cancelar a mudança, ou volte sem cancelar."
        )
    })

    it("tem as opções e o voltar da origem cancelar mudança agendada", () => {
        expect(text(cancelKey("keepDescription"))).toBe(
            'A mudança é cancelada e estes agendamentos continuam válidos, com o selo "Fora da grade atual". Nenhum aviso é enviado.'
        )
        expect(text(cancelKey("keepAction"))).toBe("Manter os agendamentos")
        expect(text(cancelKey("cancelActionOn"))).toBe(
            "Cancelar a mudança, os agendamentos e avisar os cidadãos"
        )
        expect(text(cancelKey("cancelActionOff"))).toBe("Cancelar a mudança e os agendamentos")
        expect(text(cancelKey("back"))).toBe("← Voltar sem cancelar a mudança")
    })
})
