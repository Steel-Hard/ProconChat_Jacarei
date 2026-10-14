import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { startAbandonedSessionsSweep } from "./abandonedSessionsSweep.service"

describe("startAbandonedSessionsSweep", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    test("executa a varredura a cada intervalo", async () => {
        const sweep = vi.fn().mockResolvedValue(0)
        const stop = startAbandonedSessionsSweep({ sweep, intervalMs: 1000, logger: { error: vi.fn() } })

        await vi.advanceTimersByTimeAsync(3000)

        expect(sweep).toHaveBeenCalledTimes(3)
        stop()
    })

    test("para de executar depois do stop", async () => {
        const sweep = vi.fn().mockResolvedValue(0)
        const stop = startAbandonedSessionsSweep({ sweep, intervalMs: 1000, logger: { error: vi.fn() } })

        await vi.advanceTimersByTimeAsync(1000)
        stop()
        await vi.advanceTimersByTimeAsync(5000)

        expect(sweep).toHaveBeenCalledTimes(1)
    })

    test("não sobrepõe execuções enquanto a anterior não terminou", async () => {
        let release: () => void = () => undefined
        const sweep = vi.fn().mockImplementation(
            () =>
                new Promise<number>((resolve) => {
                    release = () => resolve(0)
                }),
        )
        const stop = startAbandonedSessionsSweep({ sweep, intervalMs: 1000, logger: { error: vi.fn() } })

        await vi.advanceTimersByTimeAsync(3000)
        expect(sweep).toHaveBeenCalledTimes(1)

        release()
        await vi.advanceTimersByTimeAsync(1000)
        expect(sweep).toHaveBeenCalledTimes(2)
        stop()
    })

    test("registra a falha sem dados do cidadão e continua rodando", async () => {
        const sweep = vi
            .fn()
            .mockRejectedValueOnce(new Error("conexão caiu para 5500000000001"))
            .mockResolvedValue(0)
        const error = vi.fn()
        const stop = startAbandonedSessionsSweep({ sweep, intervalMs: 1000, logger: { error } })

        await vi.advanceTimersByTimeAsync(2000)

        expect(error).toHaveBeenCalledOnce()
        expect(JSON.stringify(error.mock.calls)).not.toContain("5500000000001")
        expect(sweep).toHaveBeenCalledTimes(2)
        stop()
    })
})
