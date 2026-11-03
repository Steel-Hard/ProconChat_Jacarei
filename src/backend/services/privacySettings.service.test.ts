import { describe, expect, it, vi } from "vitest"
import { PrivacySettingsStubRepository } from "../repositories/mock/privacySettingsStub.repository"
import { PrivacySettingsFields } from "../types/privacySettings.types"
import { createPrivacyLinkProvider, greetingPrivacyLink } from "./privacySettings.service"

const BASE_URL = "https://exemplo.sslip.io"
const POLICY_URL = "https://exemplo.sslip.io/privacidade"

const filled: PrivacySettingsFields = {
    controllerName: "Prefeitura de Jacareí",
    dpoName: null,
    contactEmail: "privacidade@exemplo.test",
    inPersonContact: null,
    retentionText: null,
    retentionEnabled: false,
    sessionRetentionDays: 90,
    appointmentRetentionDays: 365,
}

describe("greetingPrivacyLink", () => {
    it("devolve null sem a URL da politica", () => {
        expect(greetingPrivacyLink({ baseUrl: undefined, settings: filled })).toBeNull()
    })

    it("devolve null sem o nome do controlador", () => {
        expect(greetingPrivacyLink({ baseUrl: BASE_URL, settings: { ...filled, controllerName: null } })).toBeNull()
    })

    it("devolve null sem o e-mail de contato", () => {
        expect(greetingPrivacyLink({ baseUrl: BASE_URL, settings: { ...filled, contactEmail: null } })).toBeNull()
    })

    it("devolve a URL com controlador, e-mail e base, mesmo com os outros campos null", () => {
        expect(greetingPrivacyLink({ baseUrl: BASE_URL, settings: filled })).toBe(POLICY_URL)
    })
})

describe("createPrivacyLinkProvider", () => {
    it("devolve null quando a leitura falha e registra so o codigo do erro", async () => {
        const settings = new PrivacySettingsStubRepository()
        settings.findError = new Error("falha 5500000000001")
        const logger = { error: vi.fn() }
        const provider = createPrivacyLinkProvider({ settings, baseUrl: BASE_URL, logger })

        const link = await provider()

        expect(link).toBeNull()
        expect(logger.error.mock.calls).toEqual([["Failed to read privacy settings", { code: "Error" }]])
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain("5500000000001")
    })

    it("devolve null sem linha de configuracao mesmo com a URL base definida", async () => {
        const settings = new PrivacySettingsStubRepository()
        const find = vi.spyOn(settings, "find")
        const logger = { error: vi.fn() }
        const provider = createPrivacyLinkProvider({ settings, baseUrl: BASE_URL, logger })

        const link = await provider()

        expect(link).toBeNull()
        expect(find).toHaveBeenCalledTimes(1)
        expect(logger.error).not.toHaveBeenCalled()
    })
})
