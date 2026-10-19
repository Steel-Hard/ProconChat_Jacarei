import { describe, expect, test } from "vitest"
import { createPhoneQueue } from "./phoneQueue"

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

async function flush(): Promise<void> {
    for (let i = 0; i < 10; i += 1) {
        await Promise.resolve()
    }
}

describe("createPhoneQueue", () => {
    test("executa as tarefas do mesmo telefone em serie", async () => {
        const queue = createPhoneQueue()
        const events: string[] = []
        const first = deferred<void>()

        const a = queue.run("5500000000001", async () => {
            events.push("a:start")
            await first.promise
            events.push("a:end")
        })
        const b = queue.run("5500000000001", async () => {
            events.push("b:start")
        })
        await flush()
        expect(events).toEqual(["a:start"])

        first.resolve()
        await Promise.all([a, b])

        expect(events).toEqual(["a:start", "a:end", "b:start"])
    })

    test("executa telefones diferentes em paralelo", async () => {
        const queue = createPhoneQueue()
        const events: string[] = []
        const first = deferred<void>()

        const a = queue.run("5500000000001", async () => {
            events.push("a:start")
            await first.promise
        })
        const b = queue.run("5500000000002", async () => {
            events.push("b:start")
        })
        await b

        expect(events).toEqual(["a:start", "b:start"])
        first.resolve()
        await a
    })

    test("rejeita para quem chamou quando a tarefa falha", async () => {
        const queue = createPhoneQueue()

        const result = queue.run("5500000000001", async () => {
            throw new Error("falhou")
        })

        await expect(result).rejects.toThrow("falhou")
    })

    test("a falha de uma tarefa nao trava a seguinte do mesmo telefone", async () => {
        const queue = createPhoneQueue()
        const failing = queue.run("5500000000001", async () => {
            throw new Error("falhou")
        })

        const next = queue.run("5500000000001", async () => "ok")

        await expect(failing).rejects.toThrow("falhou")
        await expect(next).resolves.toBe("ok")
    })

    test("nao guarda nenhum telefone depois que a fila esvazia", async () => {
        const queue = createPhoneQueue()
        const a = queue.run("5500000000001", async () => "a")
        const b = queue.run("5500000000001", async () => {
            throw new Error("falhou")
        })
        expect(queue.size()).toBe(1)

        await a
        await expect(b).rejects.toThrow("falhou")

        expect(queue.size()).toBe(0)
    })
})
