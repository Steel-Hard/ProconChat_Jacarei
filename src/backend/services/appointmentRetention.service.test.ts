import { describe, expect, it, vi } from "vitest"
import { AppointmentRetentionRepository } from "../repositories/appointmentRetention.repository"
import { createSweepPastAppointmentPhones } from "./appointmentRetention.service"

const FIXED_NOW = new Date("2026-11-01T12:00:00.000Z")

describe("createSweepPastAppointmentPhones", () => {
    it("apaga os telefones passando ao repositorio exatamente o horario do relogio e devolve a contagem dele", async () => {
        const repository: AppointmentRetentionRepository = { erasePastAppointmentPhones: vi.fn().mockResolvedValue(7) }
        const sweep = createSweepPastAppointmentPhones({ repository, clock: () => FIXED_NOW })

        const erased = await sweep()

        expect(erased).toBe(7)
        expect(repository.erasePastAppointmentPhones).toHaveBeenCalledTimes(1)
        expect(repository.erasePastAppointmentPhones).toHaveBeenCalledWith(FIXED_NOW)
    })

    it("consulta o relogio a cada execucao", async () => {
        const repository: AppointmentRetentionRepository = { erasePastAppointmentPhones: vi.fn().mockResolvedValue(0) }
        const later = new Date("2026-11-01T12:01:00.000Z")
        const clock = vi.fn().mockReturnValueOnce(FIXED_NOW).mockReturnValueOnce(later)
        const sweep = createSweepPastAppointmentPhones({ repository, clock })

        await sweep()
        await sweep()

        expect(vi.mocked(repository.erasePastAppointmentPhones).mock.calls).toEqual([[FIXED_NOW], [later]])
    })
})
