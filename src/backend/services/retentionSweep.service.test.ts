import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest"
import { PrivacySettingsStubRepository } from "../repositories/mock/privacySettingsStub.repository"
import { RetentionStubRepository } from "../repositories/mock/retentionStub.repository"
import { PrivacySettingsRow } from "../types/privacySettings.types"
import { startPeriodicSweep } from "./periodicSweep.service"
import { createRetentionSweep } from "./retentionSweep.service"

const FIXED_NOW = new Date("2026-11-02T12:00:00.000Z")

function settingsRow(overrides: Partial<PrivacySettingsRow> = {}): PrivacySettingsRow {
    return {
        controllerName: null,
        dpoName: null,
        contactEmail: null,
        inPersonContact: null,
        retentionText: null,
        retentionEnabled: true,
        sessionRetentionDays: 120,
        appointmentRetentionDays: 400,
        updatedBy: null,
        updatedAt: FIXED_NOW,
        ...overrides,
    }
}

describe("createRetentionSweep", () => {
    let settings: PrivacySettingsStubRepository
    let repository: RetentionStubRepository
    let logger: { info: Mock<(message: string, ...details: unknown[]) => void> }

    beforeEach(() => {
        settings = new PrivacySettingsStubRepository()
        repository = new RetentionStubRepository()
        logger = { info: vi.fn() }
    })

    it("sem linha de configuracao devolve 0 sem chamar o repositorio", async () => {
        const sweep = createRetentionSweep({ settings, repository, clock: () => FIXED_NOW, logger })

        const total = await sweep()

        expect(total).toBe(0)
        expect(repository.anonymizeDueCalls).toEqual([])
    })

    it("com a anonimizacao desligada devolve 0 sem chamar o repositorio", async () => {
        settings.row = settingsRow({ retentionEnabled: false })
        const sweep = createRetentionSweep({ settings, repository, clock: () => FIXED_NOW, logger })

        const total = await sweep()

        expect(total).toBe(0)
        expect(repository.anonymizeDueCalls).toEqual([])
    })

    it("ligada, anonimiza uma vez com o instante do relogio, os prazos salvos e o lote de 500, e devolve a soma", async () => {
        settings.row = settingsRow()
        repository.counts = { sessions: 3, appointments: 2 }
        const sweep = createRetentionSweep({ settings, repository, clock: () => FIXED_NOW, logger })

        const total = await sweep()

        expect(total).toBe(5)
        expect(repository.anonymizeDueCalls).toEqual([{ now: FIXED_NOW, sessionDays: 120, appointmentDays: 400, limit: 500 }])
    })

    it("registra so as contagens quando anonimiza algo", async () => {
        settings.row = settingsRow()
        repository.counts = { sessions: 3, appointments: 2 }
        const sweep = createRetentionSweep({ settings, repository, clock: () => FIXED_NOW, logger })

        await sweep()

        expect(logger.info.mock.calls).toEqual([["Retention sweep anonymized records", { sessions: 3, appointments: 2 }]])
    })

    it("nao registra nada quando nao anonimiza nenhum registro", async () => {
        settings.row = settingsRow()
        const sweep = createRetentionSweep({ settings, repository, clock: () => FIXED_NOW, logger })

        const total = await sweep()

        expect(total).toBe(0)
        expect(logger.info).not.toHaveBeenCalled()
    })
})

describe("varredura periodica da retencao", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it.each([
        { label: "a leitura da configuracao", failOn: "settings" },
        { label: "o repositorio", failOn: "repository" },
    ])("quando $label falha registra so o codigo e continua rodando", async ({ failOn }) => {
        const settings = new PrivacySettingsStubRepository()
        settings.row = settingsRow()
        const repository = new RetentionStubRepository()
        const failure = new Error("falha 5500000000001")
        if (failOn === "settings") {
            settings.findError = failure
        } else {
            vi.spyOn(repository, "anonymizeDue").mockRejectedValueOnce(failure)
        }
        const find = vi.spyOn(settings, "find")
        const error = vi.fn()
        const sweep = createRetentionSweep({ settings, repository, clock: () => FIXED_NOW, logger: { info: vi.fn() } })
        const stop = startPeriodicSweep({
            sweep,
            intervalMs: 3_600_000,
            logger: { error },
            failureMessage: "Failed to anonymize records by retention",
        })

        await vi.advanceTimersByTimeAsync(3_600_000)
        settings.findError = null
        await vi.advanceTimersByTimeAsync(3_600_000)
        stop()

        expect(error.mock.calls).toEqual([["Failed to anonymize records by retention", { code: "Error" }]])
        expect(JSON.stringify(error.mock.calls)).not.toContain("5500000000001")
        expect(find).toHaveBeenCalledTimes(2)
    })
})
