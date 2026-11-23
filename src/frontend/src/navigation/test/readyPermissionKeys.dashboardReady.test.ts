import { describe, expect, it, vi } from "vitest"
import readyPermissionKeys from "@/navigation/readyPermissionKeys"

vi.mock("@/navigation/navItemsReady", () => ({
    default: {
        dashboard: true,
        appointments: true,
        reports: false,
        content: false,
        sessions: false,
        schedule: false,
        documents: false,
        users: true,
        whatsapp: true
    }
}))

describe("readyPermissionKeys com o Dashboard pronto", () => {
    it("não libera Ver relatórios nem Ver sessões só porque o Dashboard ficou pronto", () => {
        const keys = readyPermissionKeys()

        expect(keys).not.toContain("reports.view")
        expect(keys).not.toContain("sessions.view")
    })
})
