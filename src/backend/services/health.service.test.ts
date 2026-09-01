import { describe, it, expect } from "vitest"
import HealthService from "./health.service"

describe("HealthService", () => {
    it("check returns status ok", () => {
        const service = new HealthService()

        expect(service.check()).toEqual({ status: "ok" })
    })
})
