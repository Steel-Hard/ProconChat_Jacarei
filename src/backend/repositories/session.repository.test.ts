import { beforeEach, describe, expect, it, vi } from "vitest"

const { query, release } = vi.hoisted(() => ({
    query: vi.fn(),
    release: vi.fn(),
}))

vi.mock("../db/connection", () => ({
    default: () => ({
        connect: async () => ({ query, release }),
    }),
}))

import { sessionRepository } from "./session.repository"

describe("sessionRepository", () => {
    beforeEach(() => {
        query.mockReset()
        release.mockReset()
    })

    it("records an abandonment step atomically before opening the next session", async () => {
        query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{
                    id: "new-session",
                    current_step: "AWAITING_CATEGORY",
                    current_category_id: null,
                }],
            })
            .mockResolvedValueOnce({ rows: [] })

        const session = await sessionRepository.findOrCreateActive("phone-hash")

        expect(session).toEqual({
            id: "new-session",
            created: true,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
        })
        const [abandonmentSql, values] = query.mock.calls[1] as [string, unknown[]]
        expect(abandonmentSql).toContain("last_interaction_at <= now() - interval '30 minutes'")
        expect(abandonmentSql).toContain("abandoned_at_step = stale.current_step")
        expect(abandonmentSql).toContain("jsonb_build_object('step', current_step)")
        expect(values).toEqual(["phone-hash"])
        expect(query.mock.calls[3]?.[0]).toBe("COMMIT")
        expect(release).toHaveBeenCalledOnce()
    })
})
