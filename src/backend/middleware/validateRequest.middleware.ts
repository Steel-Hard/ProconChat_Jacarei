import { NextFunction, Request, Response } from "express"
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

export function validateRequest(schemas: {
    query?: z.ZodSchema
    params?: z.ZodSchema
    body?: z.ZodSchema
}) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            if (schemas.query) {
                const validatedQuery = validateSchema(schemas.query, req.query)
                Object.defineProperty(req, "query", {
                    value: validatedQuery,
                    configurable: true,
                    writable: true,
                })
            }
            if (schemas.params) {
                const validatedParams = validateSchema(schemas.params, req.params)
                Object.defineProperty(req, "params", {
                    value: validatedParams,
                    configurable: true,
                    writable: true,
                })
            }
            if (schemas.body) {
                req.body = validateSchema(schemas.body, req.body)
            }
            next()
        } catch (error) {
            next(error)
        }
    }
}
