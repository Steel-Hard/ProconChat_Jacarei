import { describe, expect, it } from "vitest"
import type { NavigationState } from "../session.repository"
import { InMemorySessionRepository } from "./sessionMock.repository"

describe("InMemorySessionRepository", () => {
    it("mantém categoria, pergunta e rascunho quando a chave não vem", async () => {
        const repository = new InMemorySessionRepository({ ids: ["sess_1"] })
        await repository.findOrCreateActive("hash-1")
        await repository.updateNavigationState("sess_1", {
            currentStep: "AWAITING_HOLDER_NAME",
            currentCategoryId: "1",
            currentQuestionId: "10",
            draft: { by_representative: false },
        })

        await repository.updateNavigationState("sess_1", { currentStep: "AWAITING_HOLDER_CPF" } as NavigationState)

        expect(repository.snapshot("sess_1")).toMatchObject({
            currentStep: "AWAITING_HOLDER_CPF",
            currentCategoryId: "1",
            currentQuestionId: "10",
            draft: { by_representative: false },
        })
    })

    it("volta a página para 1 quando listPage não vem", async () => {
        const repository = new InMemorySessionRepository({ ids: ["sess_1"] })
        await repository.findOrCreateActive("hash-1")
        await repository.updateNavigationState("sess_1", {
            currentStep: "AWAITING_SLOT",
            currentCategoryId: null,
            listPage: 3,
        })

        await repository.updateNavigationState("sess_1", {
            currentStep: "AWAITING_SLOT",
            currentCategoryId: null,
        })

        expect(repository.snapshot("sess_1")?.listPage).toBe(1)
    })

    it("limpa o rascunho quando draft é null", async () => {
        const repository = new InMemorySessionRepository({ ids: ["sess_1"] })
        await repository.findOrCreateActive("hash-1")
        await repository.updateNavigationState("sess_1", {
            currentStep: "AWAITING_HOLDER_NAME",
            currentCategoryId: null,
            draft: { by_representative: true },
        })

        await repository.updateNavigationState("sess_1", {
            currentStep: "AWAITING_ATTENDEE",
            currentCategoryId: null,
            draft: null,
        })

        expect(repository.snapshot("sess_1")?.draft).toBeNull()
    })

    it("cria a sessão na primeira chamada e reaproveita nas seguintes", async () => {
        const repository = new InMemorySessionRepository({ ids: ["sess_1", "sess_2"] })

        const first = await repository.findOrCreateActive("hash-1")
        const second = await repository.findOrCreateActive("hash-1")

        expect(first).toEqual({
            id: "sess_1",
            created: true,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            currentQuestionId: null,
            listPage: 1,
            draft: null,
        })
        expect(second).toEqual({ ...first, created: false })
    })
})
