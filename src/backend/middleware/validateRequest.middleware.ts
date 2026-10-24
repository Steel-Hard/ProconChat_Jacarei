import { NextFunction, Request, Response } from "express"
import { z } from "zod"
import { validateSchema, ValidateSchemaOptions } from "../utils/validateSchema"

export { validateSchema }

export function validateRequest(
    schemas: {
        query?: z.ZodSchema
        params?: z.ZodSchema
        body?: z.ZodSchema
    },
    options: ValidateSchemaOptions = {},
) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            if (schemas.query) {
                const validatedQuery = validateSchema(schemas.query, req.query, options)
                Object.defineProperty(req, "query", {
                    value: validatedQuery,
                    configurable: true,
                    writable: true,
                })
            }
            if (schemas.params) {
                const validatedParams = validateSchema(schemas.params, req.params, options)
                Object.defineProperty(req, "params", {
                    value: validatedParams,
                    configurable: true,
                    writable: true,
                })
            }
            if (schemas.body) {
                req.body = validateSchema(schemas.body, req.body, options)
            }
            next()
        } catch (error) {
            next(error)
        }
    }
}
