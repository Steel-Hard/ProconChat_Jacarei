import { z } from "zod"
import BadRequestError from "../errors/BadRequestError"

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data)
    if (!result.success) {
        const issues = result.error.issues || []
        const errorDetails = issues
            .map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`)
            .join("; ")
        throw new BadRequestError(`Dados inválidos: ${errorDetails}`)
    }
    return result.data
}
