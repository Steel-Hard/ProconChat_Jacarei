import { describe, expect, it } from "vitest"
import { PERMISSIONS } from "./auth.types"

describe("PERMISSIONS", () => {
    it("tem exatamente as 8 chaves do database.md, nesta ordem", () => {
        expect(PERMISSIONS).toEqual([
            "appointments.view",
            "appointments.manage",
            "content.manage",
            "schedule.configure",
            "documents.configure",
            "sessions.view",
            "reports.view",
            "users.manage",
        ])
    })
})
