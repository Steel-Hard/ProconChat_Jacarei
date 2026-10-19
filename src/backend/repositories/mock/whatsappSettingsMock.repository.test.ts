import { describe, expect, it } from "vitest"
import { AccessTokenLifetime } from "../../types/whatsappSettings.types"
import { MockWhatsAppSettingsRepository } from "./whatsappSettingsMock.repository"

const PERMANENT: AccessTokenLifetime = { kind: "PERMANENT", expiresAt: null }
const EXPIRING: AccessTokenLifetime = { kind: "EXPIRING", expiresAt: "2026-10-20T12:00:00.000Z" }
const VERIFIED = { displayPhoneNumber: "+55 12 3955-9000", verifiedName: "PROCON Jacareí" }

describe("MockWhatsAppSettingsRepository.recordCredentialsCheck", () => {
    it("ignora o tipo do token sem o número verificado, como o repositório real", async () => {
        const repository = new MockWhatsAppSettingsRepository({ accessTokenLifetime: EXPIRING })

        await repository.recordCredentialsCheck(false, undefined, PERMANENT)

        expect(repository.row?.accessTokenLifetime).toEqual(EXPIRING)
        expect(repository.row?.credentialsValid).toBe(false)
    })

    it("grava o tipo do token junto com o número verificado", async () => {
        const repository = new MockWhatsAppSettingsRepository({ accessTokenLifetime: EXPIRING })

        await repository.recordCredentialsCheck(true, VERIFIED, PERMANENT)

        expect(repository.row).toMatchObject({ ...VERIFIED, accessTokenLifetime: PERMANENT, credentialsValid: true })
    })

    it("mantém o tipo anterior quando recebe só o número verificado", async () => {
        const repository = new MockWhatsAppSettingsRepository({ accessTokenLifetime: EXPIRING })

        await repository.recordCredentialsCheck(true, VERIFIED)

        expect(repository.row).toMatchObject({ ...VERIFIED, accessTokenLifetime: EXPIRING, credentialsValid: true })
    })
})
