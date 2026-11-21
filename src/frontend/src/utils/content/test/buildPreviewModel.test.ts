import { describe, expect, it } from "vitest"
import buildPreviewArgs from "@/utils/content/buildPreviewArgs"
import buildPreviewModel from "@/utils/content/buildPreviewModel"
import type ContentPreviewResult from "@/types/content/ContentPreviewResult.types"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"

const NOTICE =
    "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."

function result(
    overrides: Partial<ContentPreviewResult["botMessages"]> = {}
): ContentPreviewResult {
    return {
        botMessages: {
            categoryList: {
                message: {
                    type: "list",
                    text: "Escolha uma das perguntas abaixo:",
                    buttonText: "Ver perguntas",
                    rows: [
                        { id: "q_1", title: "Primeira", description: "Desc" },
                        { id: "q_2", title: "Editada" },
                        { id: "next", title: "Ver mais opções" }
                    ]
                },
                currentRowIndex: 1,
                page: 1,
                totalPages: 2
            },
            officialMessages: [
                { type: "text", text: `Resposta oficial\n\n${NOTICE}` },
                {
                    type: "buttons",
                    text: "A dúvida foi resolvida?",
                    buttons: [
                        { id: "resolved_yes", title: "Sim" },
                        { id: "resolved_no", title: "Não" }
                    ]
                }
            ],
            aiMessage: null,
            aiLengthWarning: { exceedsLimit: false, length: 0, limit: 1024, message: null },
            ...overrides
        }
    }
}

describe("buildPreviewModel", () => {
    it("o balão oficial é exatamente o texto devolvido pela API", () => {
        const model = buildPreviewModel(result())

        expect(model.primaryBubbles[0].text).toBe(`Resposta oficial\n\n${NOTICE}`)
        expect(model.primaryBubbles[0].footerLabel).toBeNull()
    })

    it("o passo seguinte traz os botões que a API mandou", () => {
        const model = buildPreviewModel(result())

        expect(model.primaryBubbles[1]).toMatchObject({
            text: "A dúvida foi resolvida?",
            buttons: ["Sim", "Não"]
        })
    })

    it("a lista vem do bot e marca a linha atual pelo índice", () => {
        const model = buildPreviewModel(result())

        expect(model.list.text).toBe("Escolha uma das perguntas abaixo:")
        expect(model.list.buttonText).toBe("Ver perguntas")
        expect(model.list.rows.map((row) => [row.title, row.isCurrent])).toEqual([
            ["Primeira", false],
            ["Editada", true],
            ["Ver mais opções", false]
        ])
        expect(model.list.rows[0].description).toBe("Desc")
        expect(model.list).not.toHaveProperty("hasMoreOptions")
    })

    it("com IA ligada usa o balão com IA e o rodapé, e deixa o oficial como alternativa", () => {
        const model = buildPreviewModel(
            result({
                aiMessage: {
                    type: "buttons",
                    text: "Texto com IA",
                    footer: "Gerado com auxílio de IA",
                    buttons: [
                        { id: "resolved_yes", title: "Sim" },
                        { id: "resolved_no", title: "Não" }
                    ]
                }
            })
        )

        expect(model.primaryBubbles).toHaveLength(1)
        expect(model.primaryBubbles[0]).toMatchObject({
            text: "Texto com IA",
            footerLabel: "Gerado com auxílio de IA",
            buttons: ["Sim", "Não"]
        })
        expect(model.fallbackBubbles.map((bubble) => bubble.text)).toEqual([
            `Resposta oficial\n\n${NOTICE}`,
            "A dúvida foi resolvida?"
        ])
    })

    it("sem IA não há balões alternativos", () => {
        expect(buildPreviewModel(result()).fallbackBubbles).toEqual([])
    })

    it("mostra a oferta de agendamento com o botão Agendar presencial", () => {
        const model = buildPreviewModel(
            result({
                officialMessages: [
                    { type: "text", text: "Oficial" },
                    {
                        type: "buttons",
                        text: "Deseja agendar um atendimento presencial no PROCON Jacareí?",
                        buttons: [
                            { id: "schedule_yes", title: "Agendar presencial" },
                            { id: "schedule_no", title: "Agora não" }
                        ]
                    }
                ]
            })
        )

        expect(model.primaryBubbles[1].buttons).toEqual(["Agendar presencial", "Agora não"])
    })
})

const fields: ContentQuestionFormFields = {
    shortTitle: " Troca ",
    shortDescription: "",
    question: " Posso trocar? ",
    answer: " Pode. ",
    legalBasis: "",
    requiredDocuments: [" RG "],
    requiresInPerson: false,
    inPersonNote: "x",
    outOfScope: false,
    llmAllowed: true,
    active: true
}

describe("buildPreviewArgs", () => {
    it("apara os textos, troca vazio por nulo e leva as linhas da lista", () => {
        const listRows = [
            { questionId: 3, shortTitle: "Troca", shortDescription: null, isCurrent: true }
        ]

        expect(buildPreviewArgs(7, 3, fields, listRows)).toEqual({
            questionId: 3,
            categoryId: 7,
            shortTitle: "Troca",
            shortDescription: null,
            question: "Posso trocar?",
            answer: "Pode.",
            legalBasis: null,
            requiredDocuments: ["RG"],
            requiresInPerson: false,
            inPersonNote: null,
            outOfScope: false,
            llmAllowed: true,
            listRows
        })
    })

    it("não envia questionId em pergunta nova e liga a observação só no presencial", () => {
        const args = buildPreviewArgs(
            7,
            null,
            { ...fields, requiresInPerson: true, inPersonNote: " Levar RG " },
            []
        )

        expect("questionId" in args).toBe(false)
        expect(args.inPersonNote).toBe("Levar RG")
    })

    it("fora do escopo nunca envia IA ligada", () => {
        const args = buildPreviewArgs(7, null, { ...fields, outOfScope: true }, [])

        expect(args.llmAllowed).toBe(false)
    })

    it("sem excesso, não há aviso de tamanho", () => {
        expect(buildPreviewModel(result()).lengthWarning).toBeNull()
    })

    it("com excesso, repassa a mensagem de aviso como a API devolveu", () => {
        const model = buildPreviewModel(
            result({
                aiLengthWarning: {
                    exceedsLimit: true,
                    length: 1300,
                    limit: 1024,
                    message: "Aviso da API"
                }
            })
        )

        expect(model.lengthWarning).toBe("Aviso da API")
    })

    it("linhas com o mesmo id da API recebem chaves diferentes", () => {
        const model = buildPreviewModel(
            result({
                categoryList: {
                    message: {
                        type: "list",
                        text: "Escolha",
                        buttonText: "Ver",
                        rows: [
                            { id: "q_0", title: "Nova 1" },
                            { id: "q_0", title: "Nova 2" }
                        ]
                    },
                    currentRowIndex: 0,
                    page: 1,
                    totalPages: 1
                }
            })
        )
        const keys = model.list.rows.map((row) => row.key)

        expect(new Set(keys).size).toBe(2)
    })
})
