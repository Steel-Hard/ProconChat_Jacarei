import { describe, expect, test } from "vitest"
import { runAllSteps } from "./helpers/runAllSteps"

describe("runAllSteps", () => {
    test("roda todos os passos na ordem quando nenhum falha", async () => {
        const executed: string[] = []

        await runAllSteps([async () => void executed.push("a"), async () => void executed.push("b")])

        expect(executed).toEqual(["a", "b"])
    })

    test("roda os passos seguintes mesmo quando um passo falha", async () => {
        const executed: string[] = []

        await expect(
            runAllSteps([
                async () => void executed.push("a"),
                async () => {
                    throw new Error("falhou")
                },
                async () => void executed.push("c"),
            ]),
        ).rejects.toThrow()

        expect(executed).toEqual(["a", "c"])
    })

    test("lanca o primeiro erro no fim, e nao os seguintes", async () => {
        await expect(
            runAllSteps([
                async () => {
                    throw new Error("primeiro")
                },
                async () => {
                    throw new Error("segundo")
                },
            ]),
        ).rejects.toThrow("primeiro")
    })
})
