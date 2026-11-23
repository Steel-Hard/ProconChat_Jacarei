import { describe, expect, it } from "vitest"
import latestContentChange from "@/utils/content/latestContentChange"
import type ContentDraftState from "@/types/content/ContentDraftState.types"

const draft = (categories: ContentDraftState["categories"], questions = {}): ContentDraftState => ({
    categories,
    questionsByCategory: questions,
    nextNewKey: 1
})

const category = (
    key: string,
    updatedBy: { id: number; name: string } | null,
    updatedAt: string
) => ({
    key,
    id: Number(key),
    title: "t",
    shortTitle: "t",
    description: "",
    active: true,
    updatedBy,
    updatedAt
})

describe("latestContentChange", () => {
    it("devolve null quando ninguém tem autor", () => {
        expect(
            latestContentChange(draft([category("1", null, "2026-11-01T10:00:00.000Z")]))
        ).toBeNull()
    })

    it("escolhe o item mais recente com autor", () => {
        const result = latestContentChange(
            draft([
                category("1", { id: 1, name: "Ana" }, "2026-11-01T10:00:00.000Z"),
                category("2", { id: 2, name: "Bruno" }, "2026-11-05T10:00:00.000Z")
            ])
        )

        expect(result).toEqual({ changedBy: "Bruno", changedAt: "2026-11-05T10:00:00.000Z" })
    })

    it("considera as perguntas também e ignora itens novos", () => {
        const question = {
            key: "9",
            id: 9,
            categoryKey: "1",
            shortTitle: "p",
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
            updatedBy: { id: 3, name: "Carla" },
            updatedAt: "2026-11-10T10:00:00.000Z"
        }
        const result = latestContentChange(
            draft(
                [
                    category("1", { id: 1, name: "Ana" }, "2026-11-01T10:00:00.000Z"),
                    { ...category("nova-1", null, ""), id: null, updatedAt: null }
                ],
                { "1": [question] }
            )
        )

        expect(result).toEqual({ changedBy: "Carla", changedAt: "2026-11-10T10:00:00.000Z" })
    })
})
