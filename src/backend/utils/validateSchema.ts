import { z } from "zod"
import BadRequestError from "../errors/BadRequestError"

export interface ValidateSchemaOptions {
    withIssues?: boolean
}

export function validateSchema<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    options: ValidateSchemaOptions = {},
): T {
    const result = schema.safeParse(data)
    if (!result.success) {
        const issues = (result.error.issues || []).map((err: z.ZodIssue) => ({
            path: err.path.join("."),
            message: err.message,
        }))
        const errorDetails = issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")
        throw new BadRequestError(
            `Dados inválidos: ${errorDetails}`,
            options.withIssues ? { issues } : undefined,
        )
    }
    return result.data
}
