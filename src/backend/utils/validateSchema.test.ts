import { describe, expect, it } from "vitest"
import { z } from "zod"
import BadRequestError from "../errors/BadRequestError"
import { validateSchema } from "./validateSchema"

const schema = z.object({
    a: z.string({ message: "x" }),
    b: z.object({ c: z.number({ message: "y" }) }),
})

function captureError(run: () => unknown): BadRequestError {
    try {
        run()
    } catch (error) {
        if (error instanceof BadRequestError) {
            return error
        }
        throw error
    }
    throw new Error("validateSchema não lançou erro")
}

describe("validateSchema", () => {
    it("devolve o caminho e a mensagem de cada campo inválido em details.issues quando a opção está ligada", () => {
        const error = captureError(() => validateSchema(schema, { b: { c: "1" } }, { withIssues: true }))

        expect(error.message).toBe("Dados inválidos: a: x; b.c: y")
        expect(error.details).toEqual({
            issues: [
                { path: "a", message: "x" },
                { path: "b.c", message: "y" },
            ],
        })
    })

    it("não devolve details quando a opção não está ligada", () => {
        const error = captureError(() => validateSchema(schema, { b: { c: "1" } }))

        expect(error.message).toBe("Dados inválidos: a: x; b.c: y")
        expect(error.details).toBeUndefined()
    })
})
