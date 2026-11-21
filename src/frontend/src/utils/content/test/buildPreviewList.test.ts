import { describe, expect, it } from "vitest"
import buildLocalPreviewList from "@/utils/content/buildLocalPreviewList"
import buildPreviewListRows from "@/utils/content/buildPreviewListRows"
import type ContentDraftQuestion from "@/types/content/ContentDraftQuestion.types"
import type ContentDraftState from "@/types/content/ContentDraftState.types"
import type ContentPreviewListRowInput from "@/types/content/ContentPreviewListRowInput.types"

function question(key: string, overrides: Partial<ContentDraftQuestion> = {}) {
    return {
        key,
        id: Number(key) || null,
        categoryKey: "1",
        shortTitle: `T${key}`,
        shortDescription: "",
        question: "q",
        answer: "a",
        legalBasis: "",
        requiredDocuments: [],
        requiresInPerson: false,
        inPersonNote: "",
        outOfScope: false,
        llmAllowed: true,
        active: true,
        updatedBy: null,
        updatedAt: null,
        ...overrides
    } satisfies ContentDraftQuestion
}

function draftWith(questions: ContentDraftQuestion[]): ContentDraftState {
    return {
        categories: [
            {
                key: "1",
                id: 1,
                title: "C",
                shortTitle: "C",
                description: "",
                active: true,
                updatedBy: null,
                updatedAt: null
            }
        ],
        questionsByCategory: { "1": questions },
        nextNewKey: 1
    }
}

describe("buildPreviewListRows", () => {
    it("mantém a ordem do rascunho e marca exatamente a pergunta editada como atual", () => {
        const draft = draftWith([question("10"), question("11"), question("12")])

        const rows = buildPreviewListRows(draft, "1", {
            key: "11",
            shortTitle: " Novo título ",
            shortDescription: "Desc"
        })

        expect(rows).toEqual([
            { questionId: 10, shortTitle: "T10", shortDescription: null, isCurrent: false },
            {
                questionId: 11,
                shortTitle: "Novo título",
                shortDescription: "Desc",
                isCurrent: true
            },
            { questionId: 12, shortTitle: "T12", shortDescription: null, isCurrent: false }
        ])
    })

    it("deixa de fora as perguntas inativas, menos a própria", () => {
        const draft = draftWith([
            question("10", { active: false }),
            question("11", { active: false })
        ])

        const rows = buildPreviewListRows(draft, "1", {
            key: "11",
            shortTitle: "T11",
            shortDescription: ""
        })

        expect(rows.map((row) => row.questionId)).toEqual([11])
        expect(rows[0].isCurrent).toBe(true)
    })

    it("acrescenta a pergunta nova no fim, com id nulo", () => {
        const draft = draftWith([question("10")])

        const rows = buildPreviewListRows(draft, "1", {
            key: null,
            shortTitle: "Nova",
            shortDescription: ""
        })

        expect(rows).toEqual([
            { questionId: 10, shortTitle: "T10", shortDescription: null, isCurrent: false },
            { questionId: null, shortTitle: "Nova", shortDescription: null, isCurrent: true }
        ])
    })

    it("inclui perguntas novas ainda não salvas da mesma categoria", () => {
        const draft = draftWith([question("10"), question("nova-1")])

        const rows = buildPreviewListRows(draft, "1", {
            key: "10",
            shortTitle: "T10",
            shortDescription: ""
        })

        expect(rows.map((row) => row.questionId)).toEqual([10, null])
    })
})

function rowsOf(count: number, currentIndex: number): ContentPreviewListRowInput[] {
    return Array.from({ length: count }, (_, index) => ({
        questionId: index + 1,
        shortTitle: `T${index + 1}`,
        shortDescription: null,
        isCurrent: index === currentIndex
    }))
}

describe("buildLocalPreviewList", () => {
    it("mostra todas as linhas com até 10", () => {
        const list = buildLocalPreviewList(rowsOf(10, 3))

        expect(list.rows).toHaveLength(10)
        expect(list.rows[3]).toMatchObject({ title: "T4", isCurrent: true })
    })

    it("mostra só a página da pergunta atual, sem rótulos do bot", () => {
        const first = buildLocalPreviewList(rowsOf(19, 2))
        const second = buildLocalPreviewList(rowsOf(19, 12))
        const third = buildLocalPreviewList(rowsOf(19, 18))

        expect(first.rows).toHaveLength(9)
        expect(first).not.toHaveProperty("hasMoreOptions")
        expect(second.rows).toHaveLength(8)
        expect(third.rows.map((row) => row.title)).toEqual(["T18", "T19"])
    })

    it("não inventa texto de cabeçalho nem de botão", () => {
        const list = buildLocalPreviewList(rowsOf(2, 0))

        expect(list.text).toBeNull()
        expect(list.buttonText).toBeNull()
    })
})
